import type { AiModelNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const aiModelNodeHandler = createNodeHandler<AiModelNode>("ai-model", ({ node }) => ({
  type: "ai-model",
  name: node.name,
  provider: node.provider,
  model: node.model,
  temperature: node.temperature,
  maxTokens: node.maxTokens,
  credentialId: node.credentialId,
  baseUrl: node.baseUrl,
}), {
  description: "Configuration node that provides an AI model to an AI Agent.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Model" }],
  errors: ["Invalid AI model configuration"],
});
