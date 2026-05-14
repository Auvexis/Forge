import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DevWorkflowSessionManager } from "./dev-workflow-session-manager.ts";
import { workflowEventBus } from "../event-bus.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";

function workflow(): WorkflowItem {
  return {
    metadata: {
      id: "wf-1",
      name: "Workflow",
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: "2026-05-14T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {},
    edges: [],
    variables: [],
  };
}

describe("DevWorkflowSessionManager", () => {
  it("creates and stores a running dev session", () => {
    const manager = new DevWorkflowSessionManager({
      createId: () => "session-1",
    });

    const session = manager.createSession(workflow());

    assert.equal(session.id, "session-1");
    assert.equal(session.workflowId, "wf-1");
    assert.equal(session.status, "running");
    assert.equal(manager.getSession("session-1")?.id, "session-1");
  });

  it("connects created sessions to the queue", async () => {
    const ran: string[] = [];
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_1`,
      runWorkflowJob: async (job) => {
        ran.push(job.id);
      },
    });
    const wf = workflow();
    wf.nodes = {
      webhook_a: {
        type: "trigger",
        name: "Webhook A",
        trigger: { type: "webhook", webhookSlug: "hook" },
      },
    };
    const session = manager.createSession(wf);

    manager.enqueueJob(session.id, {
      triggerNodeId: "trigger",
      source: "manual",
      payload: {},
    });
    await manager.onIdle();

    assert.deepEqual(ran, ["job_1"]);
  });

  it("stops sessions with idempotent trigger teardown and removes the session", async () => {
    let teardownCalls = 0;
    const manager = new DevWorkflowSessionManager({
      createId: () => "session-1",
    });
    const session = manager.createSession(workflow());
    session.triggerRuntimes.push({
      triggerNodeId: "trigger",
      type: "manual",
      teardown: () => {
        teardownCalls++;
      },
    });

    await manager.stopSession("session-1", "manual stop");
    await manager.stopSession("session-1", "duplicate stop");

    assert.equal(teardownCalls, 1);
    assert.equal(manager.getSession("session-1"), null);
  });

  it("emits session lifecycle and forwarded node events", async () => {
    const events: string[] = [];
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_1`,
      onEvent: (event) => events.push(`${event.type}:${event.jobId ?? event.sessionId}`),
      runWorkflowJob: async (job) => {
        workflowEventBus.emitWorkflowEvent({
          type: "node:start",
          executionId: job.executionId,
          workflowId: job.workflowId,
          nodeId: "node-1",
          timestamp: Date.now(),
        });
      },
    });
    const session = manager.createSession(workflow());

    manager.enqueueJob(session.id, {
      triggerNodeId: "trigger",
      source: "manual",
      payload: {},
    });
    await manager.onIdle();
    await manager.stopSession(session.id, "done");

    assert.ok(events.includes("session:start:session_1"));
    assert.ok(events.includes("session:ready:session_1"));
    assert.ok(events.includes("node:start:job_1"));
    assert.ok(events.includes("session:stopping:session_1"));
    assert.ok(events.includes("session:stopped:session_1"));
  });

  it("enqueues enabled manual triggers when a session starts", async () => {
    const ran: string[] = [];
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_${ran.length + 1}`,
      runWorkflowJob: async (job) => {
        ran.push(`${job.triggerNodeId}:${JSON.stringify(job.payload)}`);
      },
    });
    const wf = workflow();
    wf.nodes = {
      manual_a: {
        type: "trigger",
        name: "Manual A",
        trigger: { type: "manual" },
      },
      webhook_a: {
        type: "trigger",
        name: "Webhook A",
        trigger: { type: "webhook", webhookSlug: "hook" },
      },
      manual_disabled: {
        type: "trigger",
        name: "Disabled",
        disabled: true,
        trigger: { type: "manual" },
      },
    };

    manager.createSession(wf, { initialPayload: { ok: true } });
    await manager.onIdle();

    assert.deepEqual(ran, ['manual_a:{"ok":true}']);
  });

  it("enqueues webhook dev jobs for active sessions only", async () => {
    const ran: string[] = [];
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_${ran.length + 1}`,
      runWorkflowJob: async (job) => {
        ran.push(`${job.triggerNodeId}:${job.source}:${JSON.stringify(job.payload)}`);
      },
    });
    const wf = workflow();
    wf.nodes = {
      webhook_enabled: {
        type: "trigger",
        name: "Webhook Enabled",
        trigger: { type: "webhook", webhookSlug: "orders" },
      },
      webhook_disabled: {
        type: "trigger",
        name: "Webhook Disabled",
        disabled: true,
        trigger: { type: "webhook", webhookSlug: "ignored" },
      },
    };
    manager.createSession(wf);

    assert.equal(manager.enqueueWebhook("ignored", { body: 1 }), false);
    assert.equal(manager.enqueueWebhook("orders", { body: 2 }), true);
    await manager.onIdle();

    assert.deepEqual(ran, ['webhook_enabled:webhook:{"body":2}']);
  });

  it("enqueues form dev jobs by form slug and ignores disabled forms", async () => {
    const ran: string[] = [];
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_${ran.length + 1}`,
      runWorkflowJob: async (job) => {
        ran.push(`${job.triggerNodeId}:${job.source}:${JSON.stringify(job.payload)}`);
      },
    });
    const wf = workflow();
    wf.nodes = {
      form_enabled: {
        type: "trigger",
        name: "Form Enabled",
        trigger: { type: "form", formSlug: "signup" },
      },
      form_disabled: {
        type: "trigger",
        name: "Form Disabled",
        disabled: true,
        trigger: { type: "form", formSlug: "disabled" },
      },
    };
    manager.createSession(wf);

    assert.equal(manager.enqueueForm("disabled", { fields: { email: "x" } }), false);
    assert.equal(manager.enqueueForm("signup", { fields: { email: "a@b.test" } }), true);
    await manager.onIdle();

    assert.deepEqual(ran, ['form_enabled:form:{"fields":{"email":"a@b.test"}}']);
  });
});
