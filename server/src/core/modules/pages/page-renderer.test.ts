import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderPageBody, renderPageCss, renderPublishedPage } from "./page-renderer.ts";
import type { PublishedPage } from "./page-types.ts";
import type { SailorSite } from "./site-types.ts";

function publishedPage(overrides: Partial<PublishedPage> = {}): PublishedPage {
  return {
    id: "published_contact",
    pageId: "page_contact",
    profileId: "profile_a",
    siteId: "site_default_profile_a",
    title: "Contact",
    slug: "contact",
    publishedAt: "2026-05-23T00:00:00.000Z",
    blocks: [
      {
        id: "section_1",
        tag: "section",
        props: { ariaLabel: "Main" },
        styles: { padding: "24px" },
        children: [
          { id: "text_1", tag: "text", props: { text: "Hello" }, children: [] },
        ],
      },
    ],
    ...overrides,
  };
}

function sailorSite(overrides: Partial<SailorSite> = {}): SailorSite {
  return {
    id: "site_default_profile_a",
    profileId: "profile_a",
    name: "Default Site",
    slug: "default-site",
    homePageId: "page_contact",
    files: [],
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("page renderer", () => {
  it("renders page metadata and favicon tags", () => {
    const html = renderPublishedPage({
      ...publishedPage(),
      metaTitle: "Share title",
      metaDescription: "Clean page summary",
      faviconUrl: "/sites/site_1/assets/favicon.png",
    });

    assert.match(html, /<title>Share title<\/title>/);
    assert.match(html, /<meta name="description" content="Clean page summary">/);
    assert.match(html, /<link rel="icon" href="\/sites\/site_1\/assets\/favicon\.png">/);
  });

  it("renders semantic block tree as HTML", () => {
    const html = renderPageBody(publishedPage().blocks);

    assert.match(html, /<section/);
    assert.match(html, /Hello/);
    assert.match(html, /<\/section>/);
  });

  it("escapes text, attributes, URLs, and custom class names", () => {
    const html = renderPageBody([
      {
        id: "link_1",
        tag: "link",
        className: "safe-class bad<script>",
        props: { href: "https://example.com?a=<bad>", text: "<Click>" },
        children: [],
      },
    ]);

    assert.match(html, /class="sailor-page-block sailor-block-link_1 safe-class badscript"/);
    assert.match(html, /&lt;Click&gt;/);
    assert.match(html, /href="https:\/\/example.com\?a=&lt;bad&gt;"/);
  });

  it("omits unsupported props", () => {
    const html = renderPageBody([
      {
        id: "button_1",
        tag: "button",
        props: { text: "Run", onclick: "alert(1)" } as any,
        children: [],
      },
    ]);

    assert.match(html, />Run<\/button>/);
    assert.doesNotMatch(html, /onclick/);
  });

  it("includes per-block CSS under generated block selectors", () => {
    const css = renderPageCss(
      publishedPage({
        blocks: [
          {
            id: "section_1",
            tag: "section",
            styles: { padding: "24px", fontFamily: "Inter, Arial, sans-serif" },
            customCss: "position: fixed; color: red; background-image: url(javascript:alert(1));",
            children: [],
          },
        ],
      }),
    );

    assert.match(css, /\.sailor-block-section_1 \{/);
    assert.match(css, /padding: 24px;/);
    assert.match(css, /font-family: Inter, Arial, sans-serif;/);
    assert.match(css, /position: fixed;/);
    assert.match(css, /color: red;/);
    assert.match(css, /javascript:alert\(1\)/);
  });

  it("renders dev-controlled ids, attributes, free custom css, and custom js", () => {
    const page = publishedPage({
      blocks: [
        {
          id: "section_1",
          tag: "section",
          elementId: "hero",
          className: "hero-section",
          attributes: { "data-test-id": "hero", "aria-live": "polite" },
          customCss: "--hero-angle: 32deg; background-image: url(javascript:devOnly);",
          customJs: "document.querySelector('#hero')?.setAttribute('data-ready', '1');",
          children: [],
        },
      ],
    });

    const html = renderPublishedPage(page);
    const css = renderPageCss(page);

    assert.match(html, /id="hero"/);
    assert.match(html, /class="sailor-page-block sailor-block-section_1 hero-section"/);
    assert.match(html, /data-test-id="hero"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /document\.querySelector/);
    assert.match(css, /--hero-angle: 32deg;/);
    assert.match(css, /javascript:devOnly/);
  });

  it("renders forms with data-sailor-action-id", () => {
    const html = renderPageBody([
      {
        id: "form_1",
        tag: "form",
        action: { id: "action_submit", type: "submitForm", formId: "form_contact" },
        children: [],
      },
    ]);

    assert.match(html, /<form/);
    assert.match(html, /data-sailor-action-id="action_submit"/);
  });

  it("renders action runtime inside the standalone HTML document", () => {
    const html = renderPublishedPage(
      publishedPage({
        slug: "contact",
        blocks: [
          {
            id: "form_1",
            tag: "form",
            action: { id: "action_submit", type: "submitForm", formId: "form_contact" },
            children: [{ id: "input_1", tag: "input", props: { name: "email" }, children: [] }],
          },
        ],
      }),
    );

    assert.match(html, /addEventListener\("submit"/);
    assert.match(html, /FormData/);
    assert.match(html, /encodeURIComponent\(slug\).*\/actions\/.*encodeURIComponent\(actionId\)/s);
    assert.match(html, /pendingActionId/);
    assert.match(html, /runtimeError/);
    assert.doesNotMatch(html, /eval\(/);
  });

  it("renders buttons with data-sailor-action-id", () => {
    const html = renderPageBody([
      {
        id: "button_1",
        tag: "button",
        props: { text: "Run" },
        action: { id: "action_run", type: "triggerWorkflow", workflowId: "workflow_1" },
        children: [],
      },
    ]);

    assert.match(html, /<button/);
    assert.match(html, /data-sailor-action-id="action_run"/);
  });

  it("never renders script from page content", () => {
    const html = renderPublishedPage(
      publishedPage({
        title: "<script>alert(1)</script>",
        blocks: [
          {
            id: "text_1",
            tag: "text",
            props: { text: "<script>alert(1)</script>" },
            children: [],
          },
        ],
      }),
    );

    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;alert/);
  });

  it("renders safe site css and js files with published pages", () => {
    const html = renderPublishedPage(
      publishedPage(),
      sailorSite({
        files: [
          { path: "css/site.css", kind: "file", content: "body { margin: 0; }", updatedAt: "now" },
          { path: "css/bad.css", kind: "file", content: "body { background: url(javascript:alert(1)); }", updatedAt: "now" },
          { path: "js/site.js", kind: "file", content: "document.body.dataset.ready = '1';", updatedAt: "now" },
          { path: "js/bad.js", kind: "file", content: "</script><script>alert(1)</script>", updatedAt: "now" },
        ],
      }),
    );

    assert.match(html, /body \{ margin: 0; \}/);
    assert.doesNotMatch(html, /javascript:alert/);
    assert.match(html, /document\.body\.dataset\.ready/);
    assert.doesNotMatch(html, /<\/script><script>alert/);
    assert.match(html, /<\\\/script>/);
  });

  it("resolves uploaded site asset image sources", () => {
    const html = renderPublishedPage(
      publishedPage({
        blocks: [
          {
            id: "image_1",
            tag: "image",
            props: { src: "assets/logo.png", alt: "Logo" },
            children: [],
          },
        ],
      }),
      sailorSite(),
    );

    assert.match(html, /src="\/sites\/site_default_profile_a\/assets\/logo.png"/);
  });

  it("renders media blocks with safe source attributes", () => {
    const html = renderPageBody([
      { id: "audio_1", tag: "audio", props: { src: "/media/intro.mp3", controls: true, autoplay: false }, children: [] },
      { id: "video_1", tag: "video", props: { src: "https://cdn.example.com/demo.mp4", poster: "/poster.jpg", controls: true }, children: [] },
      { id: "youtube_1", tag: "youtube", props: { videoId: "dQw4w9WgXcQ", title: "Demo" }, children: [] },
    ]);

    assert.match(html, /<audio[^>]*src="\/media\/intro.mp3"[^>]*controls/);
    assert.match(html, /<video[^>]*src="https:\/\/cdn.example.com\/demo.mp4"[^>]*poster="\/poster.jpg"[^>]*controls/);
    assert.match(html, /<iframe[^>]*src="https:\/\/www.youtube.com\/embed\/dQw4w9WgXcQ"/);
    assert.match(html, /allowfullscreen/);
  });

  it("defaults published body margin to zero and keeps explicit zero padding", () => {
    const html = renderPublishedPage(
      publishedPage({
        bodyStyles: { padding: "0", backgroundColor: "#fff" },
      }),
    );

    assert.match(html, /style="margin: 0; padding: 0; background-color: #fff; height: 100vh; min-height: 100vh;"/);
  });

  it("gives percentage-height children a definite body height in previews", () => {
    const html = renderPublishedPage(
      publishedPage({
        bodyStyles: {
          width: "100vw",
          minHeight: "100vh",
          display: "flex",
          alignItems: "stretch",
          overflow: "hidden",
        },
        blocks: [
          {
            id: "left_panel",
            tag: "div",
            styles: { width: "40%", height: "100%", backgroundColor: "#42d328" },
            children: [],
          },
        ],
      }),
    );

    assert.match(html, /style="margin: 0; width: 100vw; min-height: 100vh; display: flex; align-items: stretch; overflow: hidden; height: 100vh;"/);
    assert.match(html, /\.sailor-block-left_panel \{\n  width: 40%;\n  height: 100%;\n  background-color: #42d328;\n}/);
    assert.match(html, /html \{ width: 100%; height: 100%; }/);
    assert.match(html, /\.sailor-page-block \{ box-sizing: border-box; }/);
  });

  it("normalizes common font family names and emits uploaded font faces", () => {
    const html = renderPublishedPage(
      publishedPage({
        blocks: [
          {
            id: "label_1",
            tag: "text",
            props: { text: "Email" },
            styles: { fontFamily: "inter" },
            children: [],
          },
          {
            id: "input_1",
            tag: "input",
            styles: { fontFamily: "/sites/site_default_profile_a/assets/Brand_Inter.woff2" },
            children: [],
          },
        ],
      }),
      sailorSite({
        files: [
          {
            path: "assets/Brand_Inter.woff2",
            kind: "asset",
            mimeType: "font/woff2",
            url: "/sites/site_default_profile_a/assets/Brand_Inter.woff2",
            updatedAt: "now",
          },
        ],
      }),
    );

    assert.match(html, /@font-face \{ font-family: "Brand Inter"; src: url\("\/sites\/site_default_profile_a\/assets\/Brand_Inter\.woff2"\) format\("woff2"\); font-display: swap; }/);
    assert.match(html, /font-family: "Inter", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;/);
    assert.match(html, /font-family: "Brand Inter";/);
    assert.match(html, /input\.sailor-page-block, button\.sailor-page-block, textarea\.sailor-page-block, select\.sailor-page-block \{ font: inherit; }/);
  });
});
