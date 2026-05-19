import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SailorPlugin } from "@auvexis/sailor-sdk";

import {
  PluginTriggerRuntimeService,
  type PluginTriggerRuntimeContext,
} from "./plugin-trigger-runtime.ts";

function plugin(id: string, triggerName: string, calls: string[]): SailorPlugin {
  return {
    id,
    manifest: {
      metadata: {
        id,
        name: id,
        description: id,
        category: "test",
        author: "SAILOR",
        version: "1.0.0",
      },
      methods: {
        ping: {
          metadata: { label: "Ping", description: "Ping" },
          parameters: { type: "object", properties: {} },
          responseSchema: { type: "object", properties: {} },
        },
      },
      triggers: {
        [triggerName]: {
          metadata: { label: triggerName, description: triggerName },
          delivery: { mode: "webhook" },
          payloadSchema: { type: "object", properties: {} },
        } as any,
      },
    },
    auth: { type: "none" },
    methods: {},
    triggers: {
      [triggerName]: {
        async setup(ctx) {
          calls.push(`${id}:setup:${ctx.workflowId}:${ctx.params["channelId"]}`);
        },
        async teardown(ctx) {
          calls.push(`${id}:teardown:${ctx.workflowId}:${ctx.params["channelId"]}`);
        },
      },
    },
  };
}

function context(overrides: Partial<PluginTriggerRuntimeContext> = {}): PluginTriggerRuntimeContext {
  return {
    workflowId: "workflow-1",
    triggerNodeId: "trigger-a",
    pluginId: "telegram",
    triggerName: "onMessage",
    webhookUrl: "https://example.com/plugin-events/workflow-1/trigger-a/telegram/onMessage",
    credentials: {},
    params: { channelId: "general" },
    ...overrides,
  };
}

describe("PluginTriggerRuntimeService", () => {
  it("sets up only the selected plugin trigger", async () => {
    const calls: string[] = [];
    const runtime = new PluginTriggerRuntimeService({
      getPlugin: (id) => {
        if (id === "telegram") return plugin("telegram", "onMessage", calls);
        return plugin("slack", "onMessage", calls);
      },
    });

    await runtime.setup(context());

    assert.deepEqual(calls, ["telegram:setup:workflow-1:general"]);
  });

  it("tears down only the selected plugin trigger", async () => {
    const calls: string[] = [];
    const runtime = new PluginTriggerRuntimeService({
      getPlugin: () => plugin("telegram", "onMessage", calls),
    });

    await runtime.teardown(context());

    assert.deepEqual(calls, ["telegram:teardown:workflow-1:general"]);
  });

  it("throws a safe error when the plugin is missing", async () => {
    const runtime = new PluginTriggerRuntimeService({
      getPlugin: () => {
        throw new Error("Plugin not found: missing");
      },
    });

    await assert.rejects(
      runtime.setup(context({ pluginId: "missing" })),
      /Plugin trigger setup failed: plugin 'missing' is not registered/,
    );
  });

  it("throws a safe error when the trigger is missing from the manifest", async () => {
    const runtime = new PluginTriggerRuntimeService({
      getPlugin: () => plugin("telegram", "onMessage", []),
    });

    await assert.rejects(
      runtime.setup(context({ triggerName: "onCommand" })),
      /Plugin trigger setup failed: plugin 'telegram' does not declare trigger 'onCommand'/,
    );
  });
});
