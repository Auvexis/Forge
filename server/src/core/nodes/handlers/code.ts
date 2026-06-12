import type { CodeNode } from "../../../shared/models/workflow-types.ts";
import { runCode } from "../../modules/workflows/code-runner.ts";
import { createNodeHandler } from "../handler.ts";

export const codeNodeHandler = createNodeHandler<CodeNode>("code", async ({ node, context }) => {
  const result = runCode(node.script, context, context.variables);

  if (result.output && typeof result.output.then === "function") {
    result.output = await result.output;
  }

  if (result.output !== null && typeof result.output === "object") {
    try {
      result.output = JSON.parse(JSON.stringify(result.output));
    } catch {
      // Preserve non-serializable output as-is; logging sanitization handles it later.
    }
  }

  if (result.variables !== null && typeof result.variables === "object") {
    try {
      result.variables = JSON.parse(JSON.stringify(result.variables));
    } catch {
      // Preserve variables as-is if a value cannot be serialized.
    }
  }

  Object.assign(context.variables, result.variables);
  return result;
}, {
  description: "Runs user-authored JavaScript code with full local access by product choice.",
  execution: "stateless",
  sideEffects: ["context-write"],
  outputs: [{ id: "default", label: "Output" }],
  errors: ["Script runtime error", "Script timeout"],
});
