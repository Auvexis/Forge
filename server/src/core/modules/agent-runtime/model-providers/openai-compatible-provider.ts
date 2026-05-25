import { ChatOpenAI } from "@langchain/openai";
import { AgentRuntimeError } from "../agent-errors.ts";
import type { AiModelNodeConfig } from "../agent-types.ts";

export type AgentCredentialResolver = (
  credentialId?: string,
) => Record<string, string> | null | undefined;

export interface OpenAiCompatibleProviderOptions {
  id?: "openai" | "openrouter";
  credentialResolver: AgentCredentialResolver;
  createModel?: (config: Record<string, any>) => unknown;
}

export class OpenAiCompatibleProvider {
  public readonly id: "openai" | "openrouter";
  private readonly credentialResolver: AgentCredentialResolver;
  private readonly createModel: (config: Record<string, any>) => unknown;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.id = options.id ?? "openai";
    this.credentialResolver = options.credentialResolver;
    this.createModel = options.createModel ?? ((config) => new ChatOpenAI(config));
  }

  async createChatModel(config: AiModelNodeConfig): Promise<unknown> {
    const credentials = this.credentialResolver(config.credentialId);
    const apiKey = credentials?.api_key ?? credentials?.apiKey ?? credentials?.token;

    if (!apiKey) {
      throw new AgentRuntimeError(
        `Missing model credentials for ${config.provider}`,
        "AGENT_MODEL_CREDENTIAL_MISSING",
        "Model credentials are missing",
        400,
      );
    }

    const modelConfig: Record<string, any> = {
      model: config.model,
      temperature: clampTemperature(config.temperature),
      maxTokens: config.maxTokens,
      apiKey,
    };

    if (config.provider === "openrouter" || config.baseUrl) {
      modelConfig.configuration = {
        baseURL: config.baseUrl ?? "https://openrouter.ai/api/v1",
      };
    }

    const model = this.createModel(modelConfig);
    return hideSecretConfig(model, apiKey);
  }
}

function clampTemperature(value: number): number {
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
}

function hideSecretConfig(model: unknown, apiKey: string): unknown {
  if (!model || typeof model !== "object") return model;
  if (Object.getPrototypeOf(model) !== Object.prototype) return model;

  return JSON.parse(
    JSON.stringify(model, (_key, value) => (value === apiKey ? "[REDACTED]" : value)),
  );
}
