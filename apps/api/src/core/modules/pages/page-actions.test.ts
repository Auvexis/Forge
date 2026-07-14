import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PageActionService } from "./page-actions.ts";
import type { PublishedPage } from "./page-types.ts";

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
        id: "form_1",
        tag: "form",
        action: { id: "action_submit", type: "submitForm", formId: "contact-form" },
        children: [],
      },
      {
        id: "button_1",
        tag: "button",
        action: { id: "action_workflow", type: "triggerWorkflow", workflowId: "workflow_1", triggerId: "trigger" },
        children: [],
      },
      {
        id: "link_1",
        tag: "button",
        action: { id: "action_open", type: "openUrl", url: "https://example.com" },
        children: [],
      },
    ],
    ...overrides,
  };
}

describe("PageActionService", () => {
  it("submitForm action delegates to existing form submission behavior", async () => {
    let delegatedFormId = "";
    const service = new PageActionService({
      getPublishedPageBySlug: () => publishedPage(),
      processFormSubmission: async (formId) => {
        delegatedFormId = formId;
        return { ok: true, workflow: {} as any, executionId: "exec_form" };
      },
      getWorkflowById: () => null,
      executeWorkflowFromTrigger: async () => ({}),
    });

    const result = await service.submitAction("profile_a", "contact", "action_submit", { body: {}, headers: {}, ip: "127.0.0.1" });

    assert.deepEqual(result, { ok: true, statusCode: 202, executionId: "exec_form" });
    assert.equal(delegatedFormId, "contact-form");
  });

  it("required fields still fail through form validation", async () => {
    const service = new PageActionService({
      getPublishedPageBySlug: () => publishedPage(),
      processFormSubmission: async () => ({ ok: false, statusCode: 400, message: "Field Email is required." }),
      getWorkflowById: () => null,
      executeWorkflowFromTrigger: async () => ({}),
    });

    const result = await service.submitAction("profile_a", "contact", "action_submit", { body: {}, headers: {}, ip: "127.0.0.1" });

    assert.deepEqual(result, { ok: false, statusCode: 400, message: "Field Email is required." });
  });

  it("form rate limit still applies", async () => {
    const service = new PageActionService({
      getPublishedPageBySlug: () => publishedPage(),
      processFormSubmission: async () => ({ ok: false, statusCode: 429, message: "Too many submissions" }),
      getWorkflowById: () => null,
      executeWorkflowFromTrigger: async () => ({}),
    });

    const result = await service.submitAction("profile_a", "contact", "action_submit", { body: {}, headers: {}, ip: "127.0.0.1" });

    assert.deepEqual(result, { ok: false, statusCode: 429, message: "Too many submissions" });
  });

  it("triggerWorkflow action executes selected workflow trigger with mapped payload", async () => {
    const calls: unknown[] = [];
    const workflow = { metadata: { id: "workflow_1", isActive: true, isDraft: false } };
    const service = new PageActionService({
      getPublishedPageBySlug: () => publishedPage(),
      processFormSubmission: async () => ({ ok: true, workflow: {} as any, executionId: "exec_form" }),
      getWorkflowById: () => workflow as any,
      executeWorkflowFromTrigger: async (...args) => {
        calls.push(args);
        return {
          executionId: args[3],
          status: "SUCCESS",
          context: { result: { fruits: ["apple", "banana"] } },
        };
      },
    });

    const result = await service.submitAction("profile_a", "contact", "action_workflow", {
      body: { name: "Ada" },
      headers: { "user-agent": "node-test" },
      ip: "127.0.0.1",
    });

    assert.equal(result.ok, true);
    assert.equal((result as any).statusCode, 200);
    assert.deepEqual((result as any).result, { fruits: ["apple", "banana"] });
    assert.equal(calls.length, 1);
    assert.equal((calls[0] as any[])[0], workflow);
    assert.equal((calls[0] as any[])[1], "trigger");
    assert.deepEqual((calls[0] as any[])[2].fields, { name: "Ada" });
  });

  it("published action resolves the page inside the requested site", async () => {
    let resolvedSiteId = "";
    const service = new PageActionService({
      resolveSiteId: () => "site_marketing",
      getPublishedPageBySlug: (_profileId, _slug, siteId) => {
        resolvedSiteId = siteId ?? "";
        return publishedPage({ siteId: "site_marketing" });
      },
      processFormSubmission: async () => ({ ok: true, workflow: {} as any, executionId: "exec_form" }),
      getWorkflowById: () => ({ metadata: { id: "workflow_1", isActive: true, isDraft: false } }) as any,
      executeWorkflowFromTrigger: async (_workflow, _triggerId, _payload, executionId) => ({
        executionId,
        status: "SUCCESS",
        context: { result: { ok: true } },
      }),
    });

    const result = await service.submitAction(
      "profile_a",
      "contact",
      "action_workflow",
      { body: {}, headers: {}, ip: "127.0.0.1" },
      { siteId: "public_marketing" },
    );

    assert.equal(result.ok, true);
    assert.equal(resolvedSiteId, "site_marketing");
  });

  it("preview action resolves draft pages by id", async () => {
    let draftPageId = "";
    const service = new PageActionService({
      getDraftPageById: (_profileId, pageId) => {
        draftPageId = pageId;
        return publishedPage({ id: "preview_page_contact", pageId });
      },
      processFormSubmission: async () => ({ ok: true, workflow: {} as any, executionId: "exec_form" }),
      getWorkflowById: () => ({ metadata: { id: "workflow_1", isActive: true, isDraft: false } }) as any,
      executeWorkflowFromTrigger: async (_workflow, _triggerId, _payload, executionId) => ({
        executionId,
        status: "SUCCESS",
        context: { result: { ok: true } },
      }),
    });

    const result = await service.submitPreviewAction("profile_a", "page_contact", "action_workflow", {
      body: {},
      headers: {},
      ip: "127.0.0.1",
    });

    assert.equal(result.ok, true);
    assert.equal(draftPageId, "page_contact");
  });

  it("failed workflow action returns a safe error", async () => {
    const service = new PageActionService({
      getPublishedPageBySlug: () => publishedPage(),
      processFormSubmission: async () => ({ ok: true, workflow: {} as any, executionId: "exec_form" }),
      getWorkflowById: () => ({ metadata: { id: "workflow_1", isActive: true, isDraft: false } }) as any,
      executeWorkflowFromTrigger: async (_workflow, _triggerId, _payload, executionId) => ({
        executionId,
        status: "FAILED",
        context: { result: null },
      }),
    });

    const result = await service.submitAction("profile_a", "contact", "action_workflow", {
      body: {},
      headers: {},
      ip: "127.0.0.1",
    });

    assert.deepEqual(result, {
      ok: false,
      statusCode: 500,
      message: "Workflow finished with status FAILED",
    });
  });

  it("unknown action id returns 404", async () => {
    const service = new PageActionService({
      getPublishedPageBySlug: () => publishedPage(),
      processFormSubmission: async () => ({ ok: true, workflow: {} as any, executionId: "exec_form" }),
      getWorkflowById: () => null,
      executeWorkflowFromTrigger: async () => ({}),
    });

    const result = await service.submitAction("profile_a", "contact", "missing", { body: {}, headers: {}, ip: "127.0.0.1" });

    assert.deepEqual(result, { ok: false, statusCode: 404, message: "Page action not found" });
  });

  it("disabled or missing workflow returns safe 404/400", async () => {
    const service = new PageActionService({
      getPublishedPageBySlug: () => publishedPage(),
      processFormSubmission: async () => ({ ok: true, workflow: {} as any, executionId: "exec_form" }),
      getWorkflowById: () => ({ metadata: { id: "workflow_1", isActive: false, isDraft: false } }) as any,
      executeWorkflowFromTrigger: async () => ({}),
    });

    const result = await service.submitAction("profile_a", "contact", "action_workflow", { body: {}, headers: {}, ip: "127.0.0.1" });

    assert.deepEqual(result, { ok: false, statusCode: 400, message: "Workflow is not active" });
  });

  it("openUrl action is not executed server-side", async () => {
    const service = new PageActionService({
      getPublishedPageBySlug: () => publishedPage(),
      processFormSubmission: async () => ({ ok: true, workflow: {} as any, executionId: "exec_form" }),
      getWorkflowById: () => null,
      executeWorkflowFromTrigger: async () => {
        throw new Error("should not execute");
      },
    });

    const result = await service.submitAction("profile_a", "contact", "action_open", { body: {}, headers: {}, ip: "127.0.0.1" });

    assert.deepEqual(result, { ok: false, statusCode: 400, message: "Open URL actions run on the client" });
  });
});
