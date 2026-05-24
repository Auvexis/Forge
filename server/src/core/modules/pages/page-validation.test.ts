import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validatePageInput } from "./page-validation.ts";
import type { SailorPage } from "./page-types.ts";

function validPage(overrides: Partial<SailorPage> = {}): SailorPage {
  return {
    id: "page_contact",
    profileId: "profile_default",
    title: "Contact",
    slug: "contact",
    blocks: [
      {
        id: "block_section",
        tag: "section",
        props: {},
        styles: { padding: "24px" },
        children: [
          {
            id: "block_text",
            tag: "text",
            props: { text: "Hello" },
            styles: {},
            children: [],
          },
        ],
      },
    ],
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("page validation", () => {
  it("accepts a minimal page with one section and text block", () => {
    const result = validatePageInput(validPage());

    assert.equal(result.success, true);
    assert.equal(result.page?.blocks[0]?.tag, "section");
  });

  it("rejects unsupported tags", () => {
    const result = validatePageInput(
      validPage({
        blocks: [{ id: "bad", tag: "script" as any, children: [] }],
      }),
    );

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /unsupported tag/i);
  });

  it("strips unsupported styles", () => {
    const result = validatePageInput(
      validPage({
        blocks: [
          {
            id: "block_section",
            tag: "section",
            styles: { padding: "24px", position: "fixed" } as any,
            children: [],
          },
        ],
      }),
    );

    assert.equal(result.success, true);
    assert.deepEqual(result.page?.blocks[0]?.styles, { padding: "24px" });
  });

  it("rejects custom JavaScript", () => {
    const result = validatePageInput(
      validPage({
        blocks: [
          {
            id: "block_link",
            tag: "link",
            props: { href: "javascript:alert(1)", text: "Click" },
            children: [],
          },
        ],
      }),
    );

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /javascript/i);
  });

  it("preserves dev-controlled custom css, custom js, ids, and safe attributes", () => {
    const result = validatePageInput(
      validPage({
        blocks: [
          {
            id: "block_section",
            tag: "section",
            elementId: "hero",
            className: "hero one",
            attributes: { "data-test-id": "hero", "aria-label": "Hero", onclick: "alert(1)" } as any,
            customCss: "position: fixed; background-image: url(javascript:devOnly);",
            customJs: "document.querySelector('#hero')?.classList.add('ready');",
            children: [],
          },
        ],
      }),
    );

    assert.equal(result.success, true);
    assert.equal(result.page?.blocks[0]?.elementId, "hero");
    assert.equal(result.page?.blocks[0]?.customCss, "position: fixed; background-image: url(javascript:devOnly);");
    assert.equal(result.page?.blocks[0]?.customJs, "document.querySelector('#hero')?.classList.add('ready');");
    assert.deepEqual(result.page?.blocks[0]?.attributes, {
      "data-test-id": "hero",
      "aria-label": "Hero",
    });
  });

  it("rejects block trees deeper than 8 levels", () => {
    let child = { id: "deep_9", tag: "div", children: [] } as any;
    for (let index = 8; index >= 1; index -= 1) {
      child = { id: `deep_${index}`, tag: "div", children: [child] };
    }

    const result = validatePageInput(validPage({ blocks: [child] }));

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /depth/i);
  });

  it("rejects more than 300 blocks", () => {
    const blocks = Array.from({ length: 301 }, (_, index) => ({
      id: `text_${index}`,
      tag: "text" as const,
      props: { text: `Text ${index}` },
      children: [],
    }));

    const result = validatePageInput(validPage({ blocks }));

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /300/);
  });

  it("rejects external image URLs that are not http or https", () => {
    const result = validatePageInput(
      validPage({
        blocks: [
          {
            id: "block_image",
            tag: "image",
            props: { src: "ftp://example.com/image.png", alt: "Bad" },
            children: [],
          },
        ],
      }),
    );

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /image/i);
  });

  it("rejects action types outside submitForm, triggerWorkflow, openUrl", () => {
    const result = validatePageInput(
      validPage({
        blocks: [
          {
            id: "block_button",
            tag: "button",
            props: { text: "Run" },
            action: { id: "action_bad", type: "evalJavaScript" } as any,
            children: [],
          },
        ],
      }),
    );

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /action/i);
  });
});
