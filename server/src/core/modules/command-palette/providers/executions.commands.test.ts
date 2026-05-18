import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { executionsCommandProvider } from "./executions.commands.ts";
import { CommandExecutor } from "../command-executor.ts";
import { CommandRegistry } from "../command-registry.ts";
import type { CommandExecutionContext } from "../command-types.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";

function workflow(trigger: WorkflowItem["trigger"] = { type: "webhook", webhookSlug: "orders" }): WorkflowItem {
  return {
    metadata: {
      id: "wf_orders",
      name: "Orders",
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
      publishedAt: "2026-05-11T00:00:00.000Z",
    },
    trigger,
    nodes: {},
    edges: [],
    variables: [],
  };
}

function build(context: CommandExecutionContext) {
  const registry = new CommandRegistry();
  registry.registerProvider(executionsCommandProvider);
  return { registry, executor: new CommandExecutor(registry) };
}

describe("executions command provider", () => {
  it("opens logs for the active workflow with a typed UI intent", async () => {
    const context: CommandExecutionContext = {
      activeWorkflowId: "wf_orders",
      services: {
        executions: {
          getWorkflowById: () => workflow(),
        },
      },
    };
    const { executor } = build(context);

    const result = await executor.execute("execution.logs.open", context, {});

    assert.deepEqual(result.uiIntent, {
      type: "workflow-logs.open",
      target: "wf_orders",
    });
  });

  it("clears active workflow logs as a destructive command", async () => {
    let cleared = "";
    const context: CommandExecutionContext = {
      activeWorkflowId: "wf_orders",
      services: {
        executions: {
          getWorkflowById: () => workflow(),
          deleteWorkflowExecutions: (workflowId: string) => {
            cleared = workflowId;
          },
        },
      },
    };
    const { registry, executor } = build(context);

    const descriptor = (await registry.list(context)).find(
      (command) => command.id === "execution.logs.clear",
    );
    const result = await executor.execute("execution.logs.clear", context, {});

    assert.equal(descriptor?.destructive, true);
    assert.equal(cleared, "wf_orders");
    assert.deepEqual(result.refreshHints, ["executions"]);
  });

  it("stops active executions through the cancellation registry boundary", async () => {
    let cancelled = "";
    const context: CommandExecutionContext = {
      activeExecutionId: "exec_9",
      services: {
        executions: {
          cancelExecution: (executionId: string) => {
            cancelled = executionId;
          },
        },
      },
    };
    const { executor } = build(context);

    const result = await executor.execute("execution.stop-running", context, {});

    assert.equal(cancelled, "exec_9");
    assert.deepEqual(result.refreshHints, ["executions"]);
  });

  it("generates clipboard URLs server-side for active workflow triggers", async () => {
    const context: CommandExecutionContext = {
      activeWorkflowId: "wf_orders",
      profileId: "bruno",
      services: {
        executions: {
          getWorkflowById: () => workflow(),
          getPublicUrl: () => "https://forge.example",
        },
      },
    };
    const { executor } = build(context);

    const id = await executor.execute("utility.copy-workflow-id", context, {});
    const webhook = await executor.execute("utility.copy-webhook-url", context, {});

    assert.equal(id.clipboardText, "wf_orders");
    assert.equal(webhook.clipboardText, "https://forge.example/p/bruno/webhook/orders");
  });

  it("toggles theme through app settings service", async () => {
    let stored: unknown = null;
    const context: CommandExecutionContext = {
      services: {
        executions: {
          getSetting: () => "dark",
          setSetting: (_key: string, value: unknown) => {
            stored = value;
          },
        },
      },
    };
    const { executor } = build(context);

    const result = await executor.execute("utility.theme.toggle", context, {});

    assert.equal(stored, "light");
    assert.deepEqual(result.refreshHints, ["settings"]);
  });

  it("keeps delete individual execution unavailable until a generic endpoint exists", async () => {
    const context: CommandExecutionContext = {};
    const { registry } = build(context);

    const command = (await registry.list(context)).find(
      (descriptor) => descriptor.id === "execution.delete",
    );

    assert.equal(command?.availability.enabled, false);
  });
});
