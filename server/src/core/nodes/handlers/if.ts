import type { IfNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";
import { evaluateBooleanExpression } from "../expression.ts";

export const ifNodeHandler = createNodeHandler<IfNode>("if", ({ node, context }) => {
  const result = evaluateBooleanExpression(node.condition, context);
  return { branch: result ? "then" : "else" };
});
