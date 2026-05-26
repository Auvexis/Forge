import { validateAiModelConfig } from "../../modules/agent-runtime/agent-validation.ts";
import type { AiModelNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const aiModelNodeHandler = createNodeHandler<AiModelNode>("ai-model", ({ node }) => {
  const legacyProvider = (node as unknown as { provider?: unknown }).provider;

  return validateAiModelConfig({
    type: "ai-model",
    name: node.name,
    ...(typeof legacyProvider === "string"
      ? { provider: legacyProvider }
      : { pluginId: node.pluginId, adapter: node.adapter }),
    model: node.model,
    temperature: node.temperature,
    maxTokens: node.maxTokens,
    credentialId: node.credentialId,
    baseUrl: node.baseUrl,
  });
}, {
  description: "Configuration node that provides an AI model to an AI Agent.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Model" }],
  errors: ["Invalid AI model configuration"],
});
