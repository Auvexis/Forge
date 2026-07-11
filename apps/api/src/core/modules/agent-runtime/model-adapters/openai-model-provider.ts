import { AgentRuntimeError } from "../agent-errors.ts";
import type { AiModelNodeConfig } from "../agent-types.ts";
import type { AgentModelProvider } from "../model-provider-registry.ts";
import { OpenAiAdapter, type FetchLike } from "./openai-adapter.ts";

export type AgentCredentialResolver = (
  credentialId?: string,
) => Record<string, string> | null | undefined;

export interface OpenAiModelProviderOptions {
  credentialResolver: AgentCredentialResolver;
  adapter?: string;
  allowLocalNoAuth?: boolean;
  openai?: OpenAiAdapter;
  fetch?: FetchLike;
}

export class OpenAiModelProvider implements AgentModelProvider {
  public readonly adapter: string;
  private readonly credentialResolver: AgentCredentialResolver;
  private readonly allowLocalNoAuth: boolean;
  private readonly openai: OpenAiAdapter;

  constructor(options: OpenAiModelProviderOptions) {
    this.adapter = options.adapter ?? "openai-compatible";
    this.credentialResolver = options.credentialResolver;
    this.allowLocalNoAuth = options.allowLocalNoAuth ?? false;
    this.openai = options.openai ?? new OpenAiAdapter({ fetch: options.fetch });
  }

  async createChatModel(config: AiModelNodeConfig): Promise<unknown> {
    const credentials = this.resolveCredentials(config);
    const apiKey = credentials?.api_key ?? credentials?.apiKey ?? credentials?.token;
    const effectiveCredentials = apiKey
      ? credentials
      : this.allowLocalNoAuth && isLocalBaseUrl(config.baseUrl)
        ? { api_key: "fabric-local" }
        : undefined;

    if (!effectiveCredentials) {
      throw new AgentRuntimeError(
        `Missing model credentials for ${config.pluginId}`,
        "AGENT_MODEL_CREDENTIAL_MISSING",
        "Model credentials are missing",
        400,
      );
    }

    return this.openai.createChatModel({
      model: config.model,
      baseUrl: config.baseUrl,
      credentials: effectiveCredentials,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });
  }

  private resolveCredentials(
    config: AiModelNodeConfig,
  ): Record<string, string> | null | undefined {
    if (config.credentialId) {
      const credentials = this.credentialResolver(config.credentialId);
      if (hasApiKey(credentials)) return credentials;
    }

    return this.credentialResolver(config.pluginId);
  }
}

function hasApiKey(credentials: Record<string, string> | null | undefined): boolean {
  return Boolean(credentials?.api_key ?? credentials?.apiKey ?? credentials?.token);
}

function isLocalBaseUrl(baseUrl: string | undefined): boolean {
  if (!baseUrl) return false;
  try {
    const url = new URL(baseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}
