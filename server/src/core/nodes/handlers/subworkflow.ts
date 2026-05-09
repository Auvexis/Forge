import type { SubWorkflowNode } from "../../../shared/models/workflow-types.ts";
import { resolvePath } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../handler.ts";

export const subWorkflowNodeHandler = createNodeHandler<SubWorkflowNode>(
  "subworkflow",
  async ({ node, context, services }) => {
    const childWorkflow = services.getWorkflowById(node.workflowId);
    if (!childWorkflow) {
      throw new Error(`Sub-workflow ${node.workflowId} not found`);
    }

    const childTrigger: Record<string, any> = {};
    for (const [childKey, parentPath] of Object.entries(node.inputMapping)) {
      childTrigger[childKey] = resolvePath(context, parentPath);
    }

    const childExecutionId = `exec_sub_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const result = await services.executeWorkflow(childWorkflow, childTrigger, childExecutionId);
    return result.context;
  },
);
