import { CredentialStore } from "../plugins/credential-store.ts";
import { AgentRuntimeError } from "./agent-errors.ts";
import type { AiModelNodeConfig } from "./agent-types.ts";
import {
  OpenAiCompatibleProvider,
  type AgentCredentialResolver,
} from "./model-providers/openai-compatible-provider.ts";

export interface AgentModelProvider {
  id: string;
  createChatModel(config: AiModelNodeConfig): Promise<unknown>;
}

export interface AgentModelProviderRegistryOptions {
  providers?: AgentModelProvider[];
  credentialResolver?: AgentCredentialResolver;
}

export class AgentModelProviderRegistry {
  private readonly providers = new Map<string, AgentModelProvider>();

  constructor(options: AgentModelProviderRegistryOptions = {}) {
    const credentialResolver = options.credentialResolver ?? defaultCredentialResolver;
    const providers =
      options.providers ??
      [
        new OpenAiCompatibleProvider({ id: "openai", credentialResolver }),
        new OpenAiCompatibleProvider({ id: "openrouter", credentialResolver }),
      ];

    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }
  }

  async createChatModel(config: AiModelNodeConfig): Promise<unknown> {
    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new AgentRuntimeError(
        `Unknown model provider: ${config.provider}`,
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
