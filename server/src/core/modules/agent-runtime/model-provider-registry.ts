import { CredentialStore } from "../plugins/credential-store.ts";
import { AgentRuntimeError } from "./agent-errors.ts";
import type { AiModelNodeConfig } from "./agent-types.ts";
import {
  OpenAiCompatibleProvider,
  type AgentCredentialResolver,
} from "./model-providers/openai-compatible-provider.ts";

export interface AgentModelProvider {
  adapter: string;
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
      [new OpenAiCompatibleProvider({ credentialResolver })];

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
