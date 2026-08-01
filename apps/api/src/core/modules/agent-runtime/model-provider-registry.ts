import { CredentialStore } from "../plugins/credential-store.ts";
import { AgentRuntimeError } from "./agent-errors.ts";
import type { AiModelNodeConfig } from "./agent-types.ts";
import {
  type AgentCredentialResolver,
  OpenAiModelProvider,
} from "./model-adapters/openai-model-provider.ts";
import type { FetchLike } from "./model-adapters/openai-adapter.ts";
import { OllamaModelProvider } from "./model-adapters/ollama-model-provider.ts";
import { OpenRouterModelProvider } from "./model-adapters/openrouter-model-provider.ts";

export interface AgentModelProvider {
  adapter: string;
  createChatModel(config: AiModelNodeConfig): Promise<unknown>;
}

export interface AgentModelProviderRegistryOptions {
  providers?: AgentModelProvider[];
  credentialResolver?: AgentCredentialResolver;
  fetch?: FetchLike;
}

export class AgentModelProviderRegistry {
  private readonly providers = new Map<string, AgentModelProvider>();

  constructor(options: AgentModelProviderRegistryOptions = {}) {
    const credentialResolver = options.credentialResolver ?? defaultCredentialResolver;
    const providers =
      options.providers ??
      [
        new OpenAiModelProvider({
          credentialResolver,
          fetch: options.fetch,
        }),
        new OpenRouterModelProvider({ credentialResolver, fetch: options.fetch }),
        new OpenAiModelProvider({
          adapter: "generic",
          credentialResolver,
          allowLocalNoAuth: true,
          fetch: options.fetch,
        }),
        new OllamaModelProvider({
          credentialResolver,
        }),
      ];

    for (const provider of providers) {
      this.providers.set(provider.adapter, provider);
    }
  }

  async createChatModel(config: AiModelNodeConfig): Promise<unknown> {
    const provider = this.providers.get(config.adapter);
    if (!provider) {
      throw new AgentRuntimeError(
        `Unknown model adapter: ${config.adapter}`,
        "AGENT_MODEL_PROVIDER_UNKNOWN",
      );
    }

    return provider.createChatModel(config);
  }
}

function defaultCredentialResolver(credentialId?: string): Record<string, string> | null {
  if (!credentialId) return null;
  return CredentialStore.getCredentials(credentialId);
}
