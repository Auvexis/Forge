import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getTriggerEntry,
  listTriggerEntries,
  resolveFormTrigger,
  resolveWebhookTrigger,
} from "./workflow-triggers.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

function workflow(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    metadata: {
      id: "wf-1",
      name: "Workflow",
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-13T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {},
    edges: [],
    variables: [],
    ...overrides,
  };
}

describe("workflow trigger helpers", () => {
  it("exposes the legacy root trigger as a trigger entry", () => {
    const entries = listTriggerEntries(workflow({
      trigger: { type: "webhook", webhookSlug: "legacy-hook" },
    }));

    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, "trigger");
    assert.equal(entries[0].trigger.type, "webhook");
    assert.equal(entries[0].trigger.webhookSlug, "legacy-hook");
    assert.equal(entries[0].disabled, false);
  });

  it("exposes real trigger nodes and preserves disabled state", () => {
    const entries = listTriggerEntries(workflow({
      nodes: {
        trigger_a: {
          type: "trigger",
          name: "Webhook A",
          trigger: { type: "webhook", webhookSlug: "a" },
        },
        trigger_b: {
          type: "trigger",
          name: "Webhook B",
          disabled: true,
          trigger: { type: "webhook", webhookSlug: "b" },
        },
      },
    }));

    assert.deepEqual(entries.map((entry) => entry.id), ["trigger_a", "trigger_b"]);
    assert.equal(entries[0].disabled, false);
    assert.equal(entries[1].disabled, true);
  });

  it("resolves webhook triggers by slug and ignores disabled triggers", () => {
    const wf = workflow({
      nodes: {
        enabled: {
          type: "trigger",
          name: "Enabled",
          trigger: { type: "webhook", webhookSlug: "orders" },
        },
        disabled: {
          type: "trigger",
          name: "Disabled",
          disabled: true,
          trigger: { type: "webhook", webhookSlug: "ignored" },
        },
      },
    });

    assert.equal(resolveWebhookTrigger([wf], "orders")?.triggerNodeId, "enabled");
    assert.equal(resolveWebhookTrigger([wf], "ignored"), null);
  });

  it("resolves form triggers by public id", () => {
    const wf = workflow({
      nodes: {
        form_signup: {
          type: "trigger",
          name: "Signup",
          trigger: {
            type: "form",
            formSlug: "signup",
            formFields: [{ name: "email", label: "Email", type: "email" }],
          },
        },
      },
    });

    const resolved = resolveFormTrigger([wf], "signup", { requireActive: true });

    assert.equal(resolved?.workflow.metadata.id, "wf-1");
    assert.equal(resolved?.triggerNodeId, "form_signup");
  });

  it("returns a specific trigger entry by id", () => {
    const wf = workflow({
      nodes: {
        trigger_a: {
          type: "trigger",
          name: "Manual A",
          trigger: { type: "manual" },
        },
      },
    });

    assert.equal(getTriggerEntry(wf, "trigger_a")?.name, "Manual A");
    assert.equal(getTriggerEntry(wf, "missing"), null);
  });
});
