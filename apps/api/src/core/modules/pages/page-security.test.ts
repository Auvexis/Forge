import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PageActionService } from "./page-actions.ts";
import { renderPageBody } from "./page-renderer.ts";
import { validatePageInput } from "./page-validation.ts";
import type { PublishedPage, SailorPage } from "./page-types.ts";

function page(blocks: SailorPage["blocks"]): SailorPage {
  return {
    id: "page_1",
    profileId: "profile_a",
    siteId: "site_default_profile_a",
    title: "Secure",
    slug: "secure",
    blocks,
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T00:00:00.000Z",
  };
}

function published(): PublishedPage {
  return {
    id: "published_1",
    pageId: "page_1",
    profileId: "profile_a",
    siteId: "site_default_profile_a",
    title: "Secure",
    slug: "secure",
    publishedAt: "2026-05-23T00:00:00.000Z",
    blocks: [
      {
        id: "button_1",
        tag: "button",
        action: { id: "action_1", type: "triggerWorkflow", workflowId: "workflow_1" },
        children: [],
      },
    ],
  };
}

describe("page security boundaries", () => {
  it("does not render img event handlers", () => {
    const html = renderPageBody([
      {
        id: "image_1",
        tag: "image",
        props: { src: "https://example.com/x.png", onerror: "alert(1)" } as any,
        children: [],
      },
    ]);

    assert.doesNotMatch(html, /onerror/);
  });

  it("rejects javascript and data html URLs", () => {
    assert.equal(
      validatePageInput(page([{ id: "link_1", tag: "link", props: { href: "javascript:alert(1)" }, children: [] }])).success,
      false,
    );
    assert.equal(
      validatePageInput(page([{ id: "link_2", tag: "link", props: { href: "data:text/html,<script>alert(1)</script>" }, children: [] }])).success,
      false,
    );
  });

  it("rejects unsafe CSS values and custom CSS breakout", () => {
    assert.equal(
      validatePageInput(page([{ id: "section_1", tag: "section", styles: { backgroundImage: "url(javascript:alert(1))" }, children: [] }])).success,
      false,
    );
    assert.equal(
      validatePageInput(page([{ id: "section_2", tag: "section", customCss: "</style><script>alert(1)</script>", children: [] }])).success,
      false,
    );
  });

  it("strips position fixed", () => {
    const result = validatePageInput(page([{ id: "section_1", tag: "section", styles: { position: "fixed" } as any, children: [] }]));

    assert.equal(result.success, true);
    assert.deepEqual(result.success ? result.page.blocks[0]?.styles : null, {});
  });

  it("rejects deep and huge action payloads", async () => {
    const service = new PageActionService({
      getPublishedPageBySlug: () => published(),
      processFormSubmission: async () => ({ ok: true, workflow: {} as any, executionId: "exec_1" }),
      getWorkflowById: () => ({ metadata: { id: "workflow_1", isActive: true, isDraft: false } }) as any,
      executeWorkflowFromTrigger: async () => ({}),
    });

    const deep = { a: { b: { c: { d: { e: { f: { g: "nope" } } } } } } };
    const many = Object.fromEntries(Array.from({ length: 1000 }, (_, index) => [`k${index}`, index]));

    assert.equal((await service.submitAction("profile_a", "secure", "action_1", { body: deep, headers: {}, ip: "127.0.0.1" })).statusCode, 400);
    assert.equal((await service.submitAction("profile_a", "secure", "action_1", { body: many, headers: {}, ip: "127.0.0.1" })).statusCode, 400);
  });
});
