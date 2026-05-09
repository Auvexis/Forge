import type { SetNode } from "../../../shared/models/workflow-types.ts";
import { WorkflowParser } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../registry.ts";

export const setNodeHandler = createNodeHandler<SetNode>("set", ({ node, context }) => {
  const output: Record<string, any> = {};

  for (const assignment of node.assignments) {
    const resolved = WorkflowParser.evalParams({ value: assignment.value }, context);
    output[assignment.key] = resolved.value;
  }

  return output;
});
