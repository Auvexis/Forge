import type { ReturnNode } from "../../../shared/models/workflow-types.ts";
import { WorkflowParser } from "../../modules/workflows/parser.ts";
import { evaluateExpression } from "../expression.ts";
import { createNodeHandler } from "../handler.ts";

export const returnNodeHandler = createNodeHandler<ReturnNode>("return", ({ node, nodeId, context }) => {
  const result = resolveReturnValue(node, nodeId, context);
  context.result = result;
  context.resultSource = { type: "return", nodeId };
  return result;
}, {
  description: "Stops the workflow and exposes a final result.",
  execution: "stateless",
  sideEffects: ["context-write"],
  outputs: [{ id: "default", label: "Result" }],
  errors: ["Invalid return expression"],
});

function resolveReturnValue(node: ReturnNode, nodeId: string, context: any): unknown {
  if (node.mode === "fields") {
    const params: Record<string, unknown> = {};
    for (const field of node.fields ?? []) {
      if (!field.key) continue;
      params[field.key] = field.value;
    }
    return WorkflowParser.evalParams(params, context);
  }

  if (node.mode === "expression") {
    return evaluateExpression(node.expression || "undefined", context);
  }

  return {
    steps: cloneWorkflowValue(stepsBeforeReturn(context.steps, nodeId)),
  };
}

function cloneWorkflowValue<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function stepsBeforeReturn(
  steps: Record<string, unknown> | undefined,
  nodeId: string,
): Record<string, unknown> {
  const snapshot = { ...(steps ?? {}) };
  delete snapshot[nodeId];
  return snapshot;
}
