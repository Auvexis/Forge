import { AgentRuntimeError } from "../agent-errors.ts";
import type { AiModelNodeConfig } from "../agent-types.ts";
import type { AgentModelProvider } from "../model-provider-registry.ts";
import { boundedModelContext, modelCapabilities } from "./agent-model-capabilities.ts";
import type { AgentCredentialResolver } from "./openai-model-provider.ts";
import { OpenRouterAdapter } from "./openrouter-adapter.ts";
import type { FetchLike } from "./openai-adapter.ts";

export class OpenRouterModelProvider implements AgentModelProvider {
  readonly adapter = "openrouter";
  private readonly credentialResolver: AgentCredentialResolver;
  private readonly client: OpenRouterAdapter;

  constructor(options: { credentialResolver: AgentCredentialResolver; fetch?: FetchLike; client?: OpenRouterAdapter }) {
    this.credentialResolver = options.credentialResolver;
    this.client = options.client ?? new OpenRouterAdapter({ fetch: options.fetch });
  }

  async createChatModel(config: AiModelNodeConfig): Promise<unknown> {
    const credentials = (config.credentialId && this.credentialResolver(config.credentialId)) || this.credentialResolver(config.pluginId);
    if (!credentials?.api_key && !credentials?.apiKey && !credentials?.token) {
      throw new AgentRuntimeError("Missing OpenRouter credentials", "AGENT_MODEL_CREDENTIAL_MISSING", "Model credentials are missing", 400);
    }
    const model = this.client.createChatModel({
      model: config.model, baseUrl: config.baseUrl, credentials,
      temperature: config.temperature, maxTokens: config.maxTokens,
      numCtx: boundedModelContext(config.adapter, config.numCtx),
      thinkingEnabled: config.thinkingEnabled, thinkingRequest: config.thinkingRequest,
    });
    return Object.assign(model, { capabilities: modelCapabilities(config.adapter) });
  }
}
