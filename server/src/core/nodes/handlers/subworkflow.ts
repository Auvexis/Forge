import type { CallWorkflowNode } from "../../../shared/models/workflow-types.ts";
import { resolvePath } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../handler.ts";

export const subWorkflowNodeHandler = createNodeHandler<CallWorkflowNode>(
  "call-workflow",
  async ({ node, context, services }) => {
    const childWorkflow = services.getWorkflowById(node.targetWorkflowId);
    if (!childWorkflow) {
      throw new Error(`Call workflow target ${node.targetWorkflowId} not found`);
    }

    const childTrigger: Record<string, any> = {};
    for (const [childKey, parentPath] of Object.entries(node.inputDefaults ?? {})) {
      childTrigger[childKey] = typeof parentPath === "string" ? resolvePath(context, parentPath) : parentPath;
    }

    const childExecutionId = `exec_sub_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const result = await services.executeWorkflow(childWorkflow, childTrigger, childExecutionId);
    return result.context;
  },
  {
    description: "Dispatches a child workflow with mapped trigger input.",
    execution: "long-running",
    sideEffects: ["workflow-dispatch"],
    outputs: [{ id: "default", label: "Child context" }],
    errors: ["Call workflow target not found", "Call workflow execution failed"],
  },
);
