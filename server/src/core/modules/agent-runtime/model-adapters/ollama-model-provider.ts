import type { AiModelNodeConfig } from "../agent-types.ts";
import type { AgentModelProvider } from "../model-provider-registry.ts";
import type { AgentCredentialResolver } from "../model-providers/openai-compatible-provider.ts";
import { OllamaAdapter } from "./ollama-adapter.ts";

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
    return this.ollama.createChatModel({
      model: config.model,
      baseUrl: config.baseUrl,
      credentials: this.resolveCredentials(config) ?? undefined,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });
  }

  private resolveCredentials(config: AiModelNodeConfig): Record<string, string> | null | undefined {
    if (config.credentialId) {
      const credentials = this.credentialResolver(config.credentialId);
      if (credentials) return credentials;
    }
    return this.credentialResolver(config.pluginId);
  }
}
