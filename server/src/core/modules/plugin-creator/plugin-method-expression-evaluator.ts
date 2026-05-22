import vm from "node:vm";

export interface PluginCreatorExpressionContext {
  params: Record<string, unknown>;
  credentials: Record<string, unknown>;
  previous: unknown;
  steps: Record<string, unknown>;
  response: unknown;
  body: unknown;
  headers: Record<string, unknown>;
  status: number | null;
}

export type PluginCreatorExpressionSafetyResult =
  | { safe: true }
  | { safe: false; code: "unsafe_expression"; token: string; message: string };

const forbiddenTokens = [
  "import",
  "require",
  "process",
  "fs",
  "child_process",
  "eval",
  "Function",
  "globalThis",
  "window",
  "document",
  "__dirname",
  "__filename",
  "constructor",
];

const expressionTimeoutMs = 250;

export function isPluginCreatorExpressionSafe(source: string): PluginCreatorExpressionSafetyResult {
  for (const token of forbiddenTokens) {
    const pattern = new RegExp(`(^|[^a-zA-Z0-9_$])${escapeRegExp(token)}([^a-zA-Z0-9_$]|$)`);
    if (pattern.test(source)) {
      return {
        safe: false,
        code: "unsafe_expression",
        token,
        message: `Unsafe expression: forbidden token "${token}"`,
      };
    }
  }

  return { safe: true };
}

export function evaluatePluginCreatorExpression(
  source: string,
  context: PluginCreatorExpressionContext,
): unknown {
  const safety = isPluginCreatorExpressionSafe(source);
  if (!safety.safe) {
    throw new Error(safety.message);
  }

  const sandbox = vm.createContext({
    params: context.params,
    credentials: context.credentials,
    previous: context.previous,
    steps: context.steps,
    response: context.response,
    body: context.body,
    headers: context.headers,
    status: context.status,
  });
  const script = new vm.Script(`"use strict";\n(${source})`);

  try {
    return normalizeVmValue(script.runInContext(sandbox, { timeout: expressionTimeoutMs }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Expression evaluation failed";
    throw new Error(`Expression evaluation failed: ${message}`);
  }
}

function normalizeVmValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  return structuredClone(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
