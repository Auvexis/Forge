import type { WorkflowExecutionContext } from "./types.ts";

export function evaluateBooleanExpression(
  expression: string,
  context: WorkflowExecutionContext,
): boolean {
  const fn = new Function(
    "trigger",
    "steps",
    "variables",
    `"use strict"; return Boolean(${expression});`,
  );
  return fn(context.trigger, context.steps, context.variables);
}

export function evaluateExpression(
  expression: string,
  context: WorkflowExecutionContext,
): unknown {
  const fn = new Function(
    "trigger",
    "steps",
    "variables",
    `"use strict"; return (${expression});`,
  );
  return fn(context.trigger, context.steps, context.variables);
}
