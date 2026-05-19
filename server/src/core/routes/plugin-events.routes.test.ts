import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import Fastify from "fastify";

import pluginEventsRoutes from "./plugin-events.routes.ts";
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
});

function sign(payload: unknown, secret: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex")}`;
}
