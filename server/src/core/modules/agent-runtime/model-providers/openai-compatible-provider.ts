import { ChatOpenAI } from "@langchain/openai";
import { AgentRuntimeError } from "../agent-errors.ts";
import type { AiModelNodeConfig } from "../agent-types.ts";

export type AgentCredentialResolver = (
  credentialId?: string,
) => Record<string, string> | null | undefined;

export interface OpenAiCompatibleProviderOptions {
  credentialResolver: AgentCredentialResolver;
  adapter?: string;
  allowLocalNoAuth?: boolean;
  createModel?: (config: Record<string, any>) => unknown;
}

export class OpenAiCompatibleProvider {
  public readonly adapter: string;
  private readonly credentialResolver: AgentCredentialResolver;
  private readonly allowLocalNoAuth: boolean;
  private readonly createModel: (config: Record<string, any>) => unknown;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.adapter = options.adapter ?? "openai-compatible";
    this.credentialResolver = options.credentialResolver;
    this.allowLocalNoAuth = options.allowLocalNoAuth ?? false;
    this.createModel = options.createModel ?? ((config) => new ChatOpenAI(config));
  }

  async createChatModel(config: AiModelNodeConfig): Promise<unknown> {
    const credentials = this.resolveCredentials(config);
    const apiKey = credentials?.api_key ?? credentials?.apiKey ?? credentials?.token;

    const effectiveApiKey = apiKey ?? (this.allowLocalNoAuth && isLocalBaseUrl(config.baseUrl) ? "sailor-local" : undefined);

    if (!effectiveApiKey) {
      throw new AgentRuntimeError(
        `Missing model credentials for ${config.pluginId}`,
        "AGENT_MODEL_CREDENTIAL_MISSING",
        "Model credentials are missing",
        400,
      );
    }

    const modelConfig: Record<string, any> = {
      model: config.model,
      maxTokens: config.maxTokens,
      apiKey: effectiveApiKey,
    };
    const temperature = normalizeTemperature(config.model, config.temperature);
    if (temperature !== undefined) {
      modelConfig.temperature = temperature;
    }
    if (usesLowLatencyReasoningDefaults(config.model)) {
      modelConfig.reasoning = { effort: "minimal" };
      modelConfig.verbosity = "low";
    }
    const thinkingRequest = modelThinkingRequest(config);
    if (thinkingRequest) {
      modelConfig.modelKwargs = {
        ...(modelConfig.modelKwargs ?? {}),
        ...thinkingRequest,
      };
    }

    if (config.baseUrl) {
      modelConfig.configuration = {
        baseURL: config.baseUrl,
      };
    }

    const model = this.createModel(modelConfig);
    return hideSecretConfig(model, effectiveApiKey);
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

function clampTemperature(value: number): number {
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
}

function normalizeTemperature(model: string, value: number): number | undefined {
  if (usesDefaultTemperatureOnly(model)) return undefined;
  return clampTemperature(value);
}

function modelThinkingRequest(config: AiModelNodeConfig): Record<string, any> | undefined {
  if (!config.thinkingRequest) return undefined;
  if (config.thinkingEnabled) return config.thinkingRequest;
  if (config.thinkingSupported === false) return undefined;
  return disableThinkingRequest(config.thinkingRequest);
}

function disableThinkingRequest(value: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, disableThinkingValue(key, entry)]),
  );
}

function disableThinkingValue(key: string, value: any): any {
  if (key === "reasoning_effort" || key === "effort") return "none";
  if (key === "think" || key === "enabled") return false;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.map((entry) => disableThinkingValue(key, entry));
  if (value && typeof value === "object") return disableThinkingRequest(value);
  return value;
}

function usesDefaultTemperatureOnly(model: string): boolean {
  const normalized = model.toLowerCase();
  return /(^|[/:])gpt-5(?:-|$)/.test(normalized);
}

function usesLowLatencyReasoningDefaults(model: string): boolean {
  const normalized = model.toLowerCase();
  return /(^|[/:])gpt-5-nano(?:-|$)/.test(normalized);
}

function hideSecretConfig(model: unknown, apiKey: string): unknown {
  if (!model || typeof model !== "object") return model;
  if (Object.getPrototypeOf(model) !== Object.prototype) return model;

  return JSON.parse(
    JSON.stringify(model, (_key, value) => (value === apiKey ? "[REDACTED]" : value)),
  );
}
