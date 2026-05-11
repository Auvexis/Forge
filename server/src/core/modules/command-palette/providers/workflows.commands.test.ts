import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { workflowsCommandProvider } from "./workflows.commands.ts";
import { CommandExecutor } from "../command-executor.ts";
import { CommandRegistry } from "../command-registry.ts";
import type { CommandExecutionContext } from "../command-types.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";

function workflow(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    metadata: {
      id: "wf_alpha",
      name: "Alpha Flow",
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
      publishedAt: null,
    },
    trigger: {
      type: "webhook",
      webhookSlug: "alpha-flow",
    },
    nodes: {},
    edges: [],
    variables: [],
    ...overrides,
  };
}

function buildExecutor(context: CommandExecutionContext) {
  const registry = new CommandRegistry();
  registry.registerProvider(workflowsCommandProvider);
  return { executor: new CommandExecutor(registry), registry };
}

describe("workflows command provider", () => {
  it("indexes workflow commands and resolves drilldowns for selection", async () => {
    const context: CommandExecutionContext = {
      services: {
        workflows: {
          listWorkflows: () => [workflow()],
        },
      },
    };
    const { registry, executor } = buildExecutor(context);

    const commands = await registry.list(context);
    
    // open workflow command exists
    assert.ok(commands.some((command) => command.id === "workflow.open"));

    // executing it returns a drilldown list with the workflows
    const result = await executor.execute("workflow.open", context, {});
    assert.equal(result.drilldown?.type, "list");
    assert.equal(result.drilldown?.title, "Open Workflow");
    if (result.drilldown?.type === "list") {
      assert.ok(result.drilldown.commands.some((c) => c.id === "_pick.wf_alpha"));
    }
  });

  it("renames the active workflow via commit command from a validated payload", async () => {
    const saved: WorkflowItem[] = [];
    const context: CommandExecutionContext = {
      activeWorkflowId: "wf_alpha",
      services: {
        workflows: {
          getWorkflowById: () => workflow(),
          saveWorkflow: (item: WorkflowItem) => {
            saved.push(item);
            return item;
          },
        },
      },
    };
    const { executor } = buildExecutor(context);

    // After drilldown selection, the payload holds the target name
    const result = await executor.execute("workflow.rename.commit", context, { name: "Renamed", workflowId: "wf_alpha" });

    assert.equal(result.ok, true);
    assert.equal(saved[0]?.metadata.name, "Renamed");
    assert.deepEqual(result.refreshHints, ["workflows"]);
  });

  it("marks destructive delete as confirmation-owned by the backend descriptor", async () => {
    const context: CommandExecutionContext = {
      activeWorkflowId: "wf_alpha",
      services: {
        workflows: {
          getWorkflowById: () => workflow(),
        },
      },
    };
    const { registry } = buildExecutor(context);

    const command = (await registry.list(context)).find(
      (descriptor) => descriptor.id === "workflow.delete",
    );

    assert.equal(command?.destructive, true);
    assert.equal(command?.availability.enabled, true);
  });

  it("runs and stops active workflow executions through workflow services", async () => {
    let cancelled = "";
    const context: CommandExecutionContext = {
      activeWorkflowId: "wf_alpha",
      activeExecutionId: "exec_1",
      services: {
        workflows: {
          getWorkflowById: () => workflow(),
          executeWorkflow: async () => ({ ok: true }),
          cancelExecution: (executionId: string) => {
            cancelled = executionId;
          },
        },
      },
    };
    const { executor } = buildExecutor(context);

    const run = await executor.execute("workflow.run.picked", context, { workflowId: "wf_alpha" });
    const stop = await executor.execute("workflow.stop", context, {});

    assert.equal(run.ok, true);
    assert.equal(stop.ok, true);
    assert.equal(cancelled, "exec_1");
  });
});
