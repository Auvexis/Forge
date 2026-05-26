import type { AiModelNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const aiModelNodeHandler = createNodeHandler<AiModelNode>("ai-model", ({ node }) => {
  const legacyProvider = (node as unknown as { provider?: unknown }).provider;
  const pluginId = typeof legacyProvider === "string" ? legacyProvider : node.pluginId;

  return {
    type: "ai-model",
    name: node.name,
    pluginId,
    adapter: node.adapter ?? "openai-compatible",
    model: node.model,
    temperature: node.temperature,
    maxTokens: node.maxTokens,
    credentialId: node.credentialId,
    baseUrl: node.baseUrl,
  };
}, {
  description: "Configuration node that provides an AI model to an AI Agent.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Model" }],
  errors: ["Invalid AI model configuration"],
});
