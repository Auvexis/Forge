import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import Fastify from "fastify";

import pluginEventsRoutes from "./plugin-events.routes.ts";
import { TriggerListenerRegistry } from "../modules/workflows/trigger-listener-registry.ts";
import type { WorkflowItem } from "../../shared/models/workflow-types.ts";

function workflow(): WorkflowItem {
  return {
    metadata: {
      id: "wf-1",
      name: "Plugin Event Workflow",
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-19T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {
      triggerA: {
        type: "trigger",
        name: "Telegram Message",
        trigger: {
          type: "plugin",
          pluginId: "telegram",
          triggerName: "onMessage",
          webhookPath: "wh_wf_1_triggerA",
          webhookSecret: "secret",
        },
      },
    },
    edges: [],
    variables: [],
  };
}

describe("plugin event routes", () => {
  it("executes the matching workflow with a normalized payload", async () => {
    const executions: unknown[] = [];
    const app = Fastify({ logger: false });
    await app.register(pluginEventsRoutes, {
      workflows: {
        getWorkflowById: () => workflow(),
        saveLastTriggerPayload: () => {},
      },
      engine: {
        executeWorkflowFromTrigger: async (_workflow: WorkflowItem, _triggerNodeId: string, payload: Record<string, unknown>) => {
          executions.push(payload);
          return {};
        },
      },
      normalizer: async () => ({ eventId: "evt-1", text: "hello" }),
    });

    const body = { update_id: "evt-1", message: { text: "hello" } };
    const response = await app.inject({
      method: "POST",
      url: "/plugin-events/wf-1/triggerA/telegram/onMessage",
      payload: body,
      headers: {
        "x-sailor-signature": sign(body, "secret"),
      },
    });

    assert.equal(response.statusCode, 202, response.body);
    assert.deepEqual(executions, [{ payload: { eventId: "evt-1", text: "hello" } }]);

    await app.close();
  });

  it("rejects an invalid plugin trigger path", async () => {
    const app = Fastify({ logger: false });
    await app.register(pluginEventsRoutes, {
      workflows: {
        getWorkflowById: () => workflow(),
        saveLastTriggerPayload: () => {},
      },
      engine: {
        executeWorkflowFromTrigger: async () => ({}),
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/plugin-events/wf-1/triggerA/slack/onMessage",
      payload: {},
    });

    assert.equal(response.statusCode, 404, response.body);

    await app.close();
  });

  it("rejects invalid signatures when a trigger secret is configured", async () => {
    const app = Fastify({ logger: false });
    await app.register(pluginEventsRoutes, {
      workflows: {
        getWorkflowById: () => workflow(),
        saveLastTriggerPayload: () => {},
      },
      engine: {
        executeWorkflowFromTrigger: async () => ({}),
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/plugin-events/wf-1/triggerA/telegram/onMessage",
      payload: { update_id: "evt-1" },
      headers: {
        "x-sailor-signature": "sha256=bad",
      },
    });

    assert.equal(response.statusCode, 401, response.body);

    await app.close();
  });

  it("deduplicates provider retries with the same event id", async () => {
    let executions = 0;
    const app = Fastify({ logger: false });
    await app.register(pluginEventsRoutes, {
      workflows: {
        getWorkflowById: () => workflow(),
        saveLastTriggerPayload: () => {},
      },
      engine: {
        executeWorkflowFromTrigger: async () => {
          executions += 1;
          return {};
        },
      },
      normalizer: async () => ({ eventId: "evt-1", text: "hello" }),
    });

    const body = { update_id: "evt-1" };
    for (let i = 0; i < 2; i += 1) {
      await app.inject({
        method: "POST",
        url: "/plugin-events/wf-1/triggerA/telegram/onMessage",
        payload: body,
        headers: {
          "x-sailor-signature": sign(body, "secret"),
        },
      });
    }

    assert.equal(executions, 1);

    await app.close();
  });

  it("ignores events that do not match configured trigger filters", async () => {
    let executions = 0;
    const filteredWorkflow = workflow();
    const triggerNode = filteredWorkflow.nodes.triggerA;
    if (triggerNode.type !== "trigger" || !triggerNode.trigger) {
      throw new Error("Invalid test workflow");
    }
    triggerNode.trigger.triggerParams = { channelId: "C1" };

    const app = Fastify({ logger: false });
    await app.register(pluginEventsRoutes, {
      workflows: {
        getWorkflowById: () => filteredWorkflow,
        saveLastTriggerPayload: () => {},
      },
      engine: {
        executeWorkflowFromTrigger: async () => {
          executions += 1;
          return {};
        },
      },
      normalizer: async () => ({ eventId: "evt-1", channelId: "C2", text: "hello" }),
    });

    const body = { update_id: "evt-1" };
    const response = await app.inject({
      method: "POST",
      url: "/plugin-events/wf-1/triggerA/telegram/onMessage",
      payload: body,
      headers: {
        "x-sailor-signature": sign(body, "secret"),
      },
    });

    assert.equal(response.statusCode, 202, response.body);
    assert.equal(JSON.parse(response.body).status, "ignored");
    assert.equal(executions, 0);

    await app.close();
  });

  it("captures draft plugin events for Listen for Event without executing", async () => {
    const draftWorkflow = workflow();
    draftWorkflow.metadata.isActive = false;
    draftWorkflow.metadata.isDraft = true;

    let captured: Record<string, any> | null = null;
    let executions = 0;
    TriggerListenerRegistry.register("wh_wf_1_triggerA", "wf-1", (payload) => {
      captured = payload;
    });

    const app = Fastify({ logger: false });
    await app.register(pluginEventsRoutes, {
      workflows: {
        getWorkflowById: () => draftWorkflow,
        saveLastTriggerPayload: () => {},
      },
      engine: {
        executeWorkflowFromTrigger: async () => {
          executions += 1;
          return {};
        },
      },
      normalizer: async () => ({ eventId: "evt-1", channelId: "C1", text: "hello" }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/plugin-events/wf-1/triggerA/telegram/onMessage",
      payload: { update_id: "evt-1" },
      headers: {
        "x-sailor-signature": sign({ update_id: "evt-1" }, "secret"),
      },
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(captured, { eventId: "evt-1", channelId: "C1", text: "hello" });
    assert.equal(executions, 0);

    TriggerListenerRegistry.remove("wh_wf_1_triggerA");
    await app.close();
  });
});

function sign(payload: unknown, secret: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex")}`;
}
