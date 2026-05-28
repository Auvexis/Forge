import { CredentialStore } from "../plugins/credential-store.ts";
import { PluginManager } from "../plugins/manager.ts";
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
  createModel?: (config: Record<string, any>) => unknown;
}

export class AgentModelProviderRegistry {
  private readonly providers = new Map<string, AgentModelProvider>();

  constructor(options: AgentModelProviderRegistryOptions = {}) {
    const credentialResolver = options.credentialResolver ?? defaultCredentialResolver;
    const providers =
      options.providers ??
      [
        new OpenAiCompatibleProvider({
          credentialResolver,
          createModel: options.createModel,
        }),
        new OpenAiCompatibleProvider({
          adapter: "generic",
          credentialResolver,
          allowLocalNoAuth: true,
          createModel: options.createModel,
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

    return provider.createChatModel(hydrateModelCapabilityConfig(config));
  }
}

function hydrateModelCapabilityConfig(config: AiModelNodeConfig): AiModelNodeConfig {
  const capability = getPluginChatModelCapability(config.pluginId);
  if (!capability?.enabled || capability.adapter !== config.adapter) return config;
  const thinking = capability.thinking;
  if (!thinking) return config;
  const thinkingRequest =
    config.thinkingRequest && thinking.request
      ? { ...thinking.request, ...config.thinkingRequest }
      : config.thinkingRequest ?? thinking.request;

  return {
    ...config,
    thinkingSupported: config.thinkingSupported ?? thinking.enabled === true,
    thinkingRequest,
  };
}

function getPluginChatModelCapability(pluginId: string): any | null {
  try {
    const plugin = PluginManager.getPlugin(pluginId);
    return (plugin.manifest.metadata as any).agentCapabilities?.chatModel ?? null;
  } catch {
    return null;
  }
}

function defaultCredentialResolver(credentialId?: string): Record<string, string> | null {
  if (!credentialId) return null;
  return CredentialStore.getCredentials(credentialId);
}
