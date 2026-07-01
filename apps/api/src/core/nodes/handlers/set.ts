import type { SetNode } from "../../../shared/models/workflow-types.ts";
import { WorkflowParser } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../handler.ts";

export const setNodeHandler = createNodeHandler<SetNode>("set", ({ node, context }) => {
  const output: Record<string, any> = {};

  for (const assignment of node.assignments) {
    const resolved = WorkflowParser.evalParams({ value: assignment.value }, context);
    output[assignment.key] = resolved.value;
  }

  return output;
}, {
  description: "Creates a mapped object from literal values and workflow templates.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Output" }],
  errors: ["Invalid template expression"],
});
