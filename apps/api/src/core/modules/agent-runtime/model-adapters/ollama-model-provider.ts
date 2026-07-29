import type { AiModelNodeConfig } from "../agent-types.ts";
import type { AgentModelProvider } from "../model-provider-registry.ts";
import type { AgentCredentialResolver } from "./openai-model-provider.ts";
import { OllamaAdapter } from "./ollama-adapter.ts";
import {
  boundedModelContext,
  modelCapabilities,
} from "./agent-model-capabilities.ts";

export class OllamaModelProvider implements AgentModelProvider {
  public readonly adapter = "ollama";
  private readonly credentialResolver: AgentCredentialResolver;
  private readonly ollama: OllamaAdapter;

  constructor(options: {
    credentialResolver: AgentCredentialResolver;
    ollama?: OllamaAdapter;
  }) {
    this.credentialResolver = options.credentialResolver;
    this.ollama = options.ollama ?? new OllamaAdapter();
  }

  async createChatModel(config: AiModelNodeConfig): Promise<unknown> {
    const model = this.ollama.createChatModel({
      model: config.model,
      baseUrl: config.baseUrl,
      credentials: this.resolveCredentials(config) ?? undefined,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      numCtx: boundedModelContext(config.adapter, config.numCtx),
      topP: config.topP,
      topK: config.topK,
      repeatPenalty: config.repeatPenalty,
      seed: config.seed,
      keepAlive: config.keepAlive,
      ollamaOptions: config.ollamaOptions,
      thinkingEnabled: config.thinkingEnabled,
      thinkingRequest: config.thinkingRequest,
    });
    return Object.assign(model, { capabilities: modelCapabilities(config.adapter) });
  }

  private resolveCredentials(config: AiModelNodeConfig): Record<string, string> | null | undefined {
    if (config.credentialId) {
      const credentials = this.credentialResolver(config.credentialId);
      if (credentials) return credentials;
    }
    return this.credentialResolver(config.pluginId);
  }
}
