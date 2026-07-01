import type { AiToolNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const aiToolNodeHandler = createNodeHandler<AiToolNode>("ai-tool", ({ node }) => ({
  type: "ai-tool",
  name: node.name,
  pluginId: node.pluginId,
  methodId: node.methodId,
  descriptionOverride: node.descriptionOverride,
  timeoutMs: node.timeoutMs,
  requiresApproval: node.requiresApproval,
  sideEffect: node.sideEffect,
  inputDefaults: node.inputDefaults,
}), {
  description: "Configuration node that exposes an approved plugin method as an AI Agent tool.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Tool" }],
  errors: ["Invalid AI tool configuration"],
});
