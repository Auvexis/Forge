import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DevWorkflowSessionManager } from "./dev-workflow-session-manager.ts";
import { workflowEventBus } from "../event-bus.ts";
import {
  createTemporaryFormSession,
  resetTemporaryFormSessionsForTests,
} from "../../forms/temporary-form-session.ts";
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
  it("creates and stores a running dev session", async () => {
    const manager = new DevWorkflowSessionManager({
      createId: () => "session-1",
    });

    const session = await manager.createSession(workflow());

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
    const session = await manager.createSession(wf);

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
    const session = await manager.createSession(workflow());
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
    const session = await manager.createSession(workflow());

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

  it("keeps forwarding workflow events while a job waits for agent approval", async () => {
    const events: string[] = [];
    let waitingExecutionId = "";
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_1`,
      onEvent: (event) => events.push(event.type),
      runWorkflowJob: async (job) => {
        waitingExecutionId = job.executionId;
        workflowEventBus.emitWorkflowEvent({
          type: "agent:approval-created",
          executionId: job.executionId,
          workflowId: job.workflowId,
          nodeId: "agent",
          timestamp: Date.now(),
          data: { approvalId: "approval_1" },
        });
        workflowEventBus.emitWorkflowEvent({
          type: "workflow:waiting-approval",
          executionId: job.executionId,
          workflowId: job.workflowId,
          timestamp: Date.now(),
        });
        return { status: "WAITING_APPROVAL" };
      },
    });
    const session = await manager.createSession(workflow());

    manager.enqueueJob(session.id, {
      triggerNodeId: "trigger",
      source: "chat",
      payload: {},
    });
    await waitFor(() => events.includes("agent:approval-created"));
    assert.equal(events.includes("job:success"), false);

    workflowEventBus.emitWorkflowEvent({
      type: "agent:tool-start",
      executionId: waitingExecutionId,
      workflowId: session.workflowId,
      nodeId: "agent",
      timestamp: Date.now(),
      data: { tool: "discord_send_message" },
    });
    workflowEventBus.emitWorkflowEvent({
      type: "workflow:success",
      executionId: waitingExecutionId,
      workflowId: session.workflowId,
      timestamp: Date.now(),
    });
    await manager.onIdle();

    assert.ok(events.includes("agent:tool-start"));
    assert.ok(events.includes("job:success"));
  });

  it("does not enqueue manual triggers when a session starts without a requested trigger", async () => {
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

    await manager.createSession(wf, { initialPayload: { ok: true } });
    await manager.onIdle();

    assert.deepEqual(ran, []);
  });

  it("enqueues only the requested manual trigger when a session starts from a trigger node", async () => {
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
      manual_b: {
        type: "trigger",
        name: "Manual B",
        trigger: { type: "manual" },
      },
      webhook_a: {
        type: "trigger",
        name: "Webhook A",
        trigger: { type: "webhook", webhookSlug: "hook" },
      },
    };

    await manager.createSession(wf, {
      initialPayload: { clicked: true },
      initialTriggerNodeId: "manual_b",
    });
    await manager.onIdle();

    assert.deepEqual(ran, ['manual_b:{"clicked":true}']);
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
    await manager.createSession(wf);

    assert.equal(manager.enqueueWebhook("ignored", { body: 1 }), false);
    assert.equal(manager.enqueueWebhook("orders", { body: 2 }), true);
    await manager.onIdle();

    assert.deepEqual(ran, ['webhook_enabled:webhook:{"body":2}']);
  });

  it("does not emit trigger received when webhook payload cannot be queued", async () => {
    const events: string[] = [];
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_1`,
      maxPayloadBytes: 8,
      onEvent: (event) => events.push(event.type),
    });
    const wf = workflow();
    wf.nodes = {
      webhook_enabled: {
        type: "trigger",
        name: "Webhook Enabled",
        trigger: { type: "webhook", webhookSlug: "orders" },
      },
    };
    await manager.createSession(wf);

    assert.equal(manager.enqueueWebhook("orders", { tooLarge: true }), true);

    assert.equal(events.includes("trigger:received"), false);
    assert.equal(events.includes("job:failed"), true);
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
    await manager.createSession(wf);

    assert.equal(manager.enqueueForm("disabled", { fields: { email: "x" } }), false);
    assert.equal(manager.enqueueForm("signup", { fields: { email: "a@b.test" } }), true);
    await manager.onIdle();

    assert.deepEqual(ran, ['form_enabled:form:{"fields":{"email":"a@b.test"}}']);
  });

  it("schedules cron triggers during the session and stops them on teardown", async () => {
    let tick: (() => void) | undefined;
    let stopped = false;
    const ran: string[] = [];
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_${ran.length + 1}`,
      scheduleCron: (_expression, callback) => {
        tick = callback;
        return {
          stop: () => {
            stopped = true;
          },
        };
      },
      runWorkflowJob: async (job) => {
        ran.push(`${job.triggerNodeId}:${job.source}`);
      },
    });
    const wf = workflow();
    wf.nodes = {
      cron_a: {
        type: "trigger",
        name: "Cron A",
        trigger: { type: "cron", cronExpression: "* * * * *" },
      },
    };
    const session = await manager.createSession(wf);

    if (!tick) assert.fail("cron was not scheduled");
    tick();
    await manager.onIdle();
    await manager.stopSession(session.id, "stop");

    assert.deepEqual(ran, ["cron_a:cron"]);
    assert.equal(stopped, true);
  });

  it("activates plugin trigger lifecycle and enqueues plugin payloads", async () => {
    let activated = 0;
    let deactivated = 0;
    const modes: Array<string | undefined> = [];
    const ran: string[] = [];
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_${ran.length + 1}`,
      activatePluginTriggers: async (_workflow, options) => {
        activated++;
        modes.push(options?.mode);
      },
      deactivatePluginTriggers: async (_workflow, options) => {
        deactivated++;
        modes.push(options?.mode);
      },
      runWorkflowJob: async (job) => {
        ran.push(`${job.triggerNodeId}:${job.source}:${JSON.stringify(job.payload)}`);
      },
    });
    const wf = workflow();
    wf.nodes = {
      plugin_a: {
        type: "trigger",
        name: "Plugin A",
        trigger: {
          type: "plugin",
          pluginId: "sailor.test",
          triggerName: "message",
          webhookPath: "plugin-hook",
        },
      },
    };
    const session = await manager.createSession(wf);
    await Promise.resolve();

    assert.equal(activated, 1);
    assert.equal(manager.enqueueWebhook("plugin-hook", { message: "hi" }), true);
    await manager.onIdle();
    await manager.stopSession(session.id, "stop");

    assert.deepEqual(ran, ['plugin_a:plugin:{"message":"hi"}']);
    assert.equal(deactivated, 1);
    assert.deepEqual(modes, ["test", "test"]);
  });

  it("emits session ready only after plugin trigger setup completes", async () => {
    const events: string[] = [];
    let resolveActivation: (() => void) | undefined;
    const activated = new Promise<void>((resolve) => {
      resolveActivation = resolve;
    });
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_1`,
      onEvent: (event) => events.push(event.type),
      activatePluginTriggers: async () => {
        await activated;
      },
      deactivatePluginTriggers: async () => {},
    });
    const wf = workflow();
    wf.nodes = {
      plugin_a: {
        type: "trigger",
        name: "Plugin A",
        trigger: {
          type: "plugin",
          pluginId: "sailor.test",
          triggerName: "message",
          webhookPath: "plugin-hook",
        },
      },
    };

    const sessionPromise = manager.createSession(wf);
    await Promise.resolve();

    assert.equal(events.includes("session:ready"), false);
    resolveActivation?.();
    const session = await sessionPromise;

    assert.equal(session.status, "running");
    assert.equal(events.includes("session:ready"), true);
  });

  it("cancels temporary wait forms for running jobs when session stops", async () => {
    resetTemporaryFormSessionsForTests();
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_1`,
      runWorkflowJob: async () => new Promise(() => {}),
    });
    const wf = workflow();
    wf.nodes = {
      webhook_a: {
        type: "trigger",
        name: "Webhook A",
        trigger: { type: "webhook", webhookSlug: "hook" },
      },
    };
    const session = await manager.createSession(wf);
    manager.enqueueJob(session.id, {
      triggerNodeId: "webhook_a",
      source: "webhook",
      payload: {},
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const form = createTemporaryFormSession({
      workflowId: wf.metadata.id,
      executionId: "exec_1",
      nodeId: "wait-1",
      title: "Wait",
      fields: [],
      expiresInSeconds: 60,
    });

    const result = form.result.catch((error) => error.message);
    await manager.stopSession(session.id, "manual stop");

    assert.match(await result, /manual stop/);
  });

  it("enforces session and payload limits", async () => {
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_1`,
      maxSessions: 1,
      maxPayloadBytes: 8,
    });
    const session = await manager.createSession(workflow());

    await assert.rejects(() => manager.createSession(workflow()), /Too many active dev sessions/);
    assert.throws(
      () => manager.enqueueJob(session.id, {
        triggerNodeId: "trigger",
        source: "manual",
        payload: { tooLarge: true },
      }),
      /payload exceeds/,
    );
  });

  it("cleans up a partially created session when trigger activation fails", async () => {
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_1`,
      maxSessions: 1,
      scheduleCron: () => {
        throw new Error("invalid cron");
      },
    });
    const wf = workflow();
    wf.nodes = {
      cron_a: {
        type: "trigger",
        name: "Cron A",
        trigger: { type: "cron", cronExpression: "bad cron" },
      },
    };

    await assert.rejects(() => manager.createSession(wf), /invalid cron/);

    const cleanSession = await manager.createSession(workflow());
    assert.equal(cleanSession.status, "running");
  });

  it("stops all sessions during cleanup", async () => {
    let teardownCalls = 0;
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_${teardownCalls + 1}`,
    });
    const session = await manager.createSession(workflow());
    session.triggerRuntimes.push({
      triggerNodeId: "trigger",
      type: "manual",
      teardown: () => {
        teardownCalls++;
      },
    });

    await manager.stopAll("server shutdown");

    assert.equal(teardownCalls, 1);
    assert.equal(manager.getSession(session.id), null);
  });
});

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.fail("condition was not met");
}
