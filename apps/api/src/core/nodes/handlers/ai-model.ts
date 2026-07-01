import { validateAiModelConfig } from "../../modules/agent-runtime/agent-validation.ts";
import type { AiModelNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const aiModelNodeHandler = createNodeHandler<AiModelNode>("ai-model", ({ node }) => {
  const legacyProvider = (node as unknown as { provider?: unknown }).provider;
  const hasPluginModelIdentity = typeof node.pluginId === "string" || typeof node.adapter === "string";

  return validateAiModelConfig({
    type: "ai-model",
    name: node.name,
    ...(hasPluginModelIdentity
      ? { pluginId: node.pluginId, adapter: node.adapter }
      : typeof legacyProvider === "string"
        ? { provider: legacyProvider }
        : { pluginId: node.pluginId, adapter: node.adapter }),
    model: node.model,
    temperature: node.temperature,
    maxTokens: node.maxTokens,
    numCtx: node.numCtx,
    topP: node.topP,
    topK: node.topK,
    repeatPenalty: node.repeatPenalty,
    seed: node.seed,
    keepAlive: node.keepAlive,
    ollamaOptions: node.ollamaOptions,
    credentialId: node.credentialId,
    baseUrl: node.baseUrl,
    thinkingEnabled: node.thinkingEnabled,
    thinkingRequest: node.thinkingRequest,
    thinkingSupported: node.thinkingSupported,
  });
}, {
  description: "Configuration node that provides an AI model to an AI Agent.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Model" }],
  errors: ["Invalid AI model configuration"],
});
