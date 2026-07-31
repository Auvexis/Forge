import type { AgentProviderId } from "../engine-protocol/agent-provider-metadata.ts";
import type { AgentProviderContinuationAdapter } from "./agent-provider-continuation-adapter.ts";
import {
  AnthropicContinuationAdapter,
  DeepSeekContinuationAdapter,
  GeminiContinuationAdapter,
  OllamaContinuationAdapter,
  OpenAiContinuationAdapter,
} from "./provider-continuation-adapters.ts";

export class AgentProviderContinuationRegistry {
  private readonly adapters = new Map<AgentProviderId, AgentProviderContinuationAdapter>();

  constructor(adapters: AgentProviderContinuationAdapter[] = defaultAdapters()) {
    for (const adapter of adapters) this.adapters.set(adapter.provider, adapter);
  }

  get(provider: AgentProviderId): AgentProviderContinuationAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`Provider continuation adapter not found: ${provider}`);
    return adapter;
  }
}

function defaultAdapters(): AgentProviderContinuationAdapter[] {
  return [
    new OllamaContinuationAdapter(),
    new OpenAiContinuationAdapter(),
    new AnthropicContinuationAdapter(),
    new GeminiContinuationAdapter(),
    new DeepSeekContinuationAdapter(),
  ];
}
