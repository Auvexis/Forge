import type { AgentModelAdapter } from "../agent-types.ts";

export type AgentStructuredOutputMode = "json-schema" | "json-object" | "text";

export interface AgentModelCapabilities {
  structuredOutput: AgentStructuredOutputMode;
  nativeToolHistory: boolean;
  defaultContextTokens: number;
  maxContextTokens: number;
}

const CAPABILITY_MATRIX: Record<AgentModelAdapter, AgentModelCapabilities> = {
  "openai-compatible": {
    structuredOutput: "json-schema",
    nativeToolHistory: true,
    defaultContextTokens: 128_000,
    maxContextTokens: 400_000,
  },
  openrouter: {
    structuredOutput: "json-object",
    nativeToolHistory: true,
    defaultContextTokens: 128_000,
    maxContextTokens: 1_000_000,
  },
  generic: {
    structuredOutput: "json-schema",
    nativeToolHistory: false,
    defaultContextTokens: 16_384,
    maxContextTokens: 128_000,
  },
  ollama: {
    structuredOutput: "json-schema",
    nativeToolHistory: true,
    defaultContextTokens: 8_192,
    maxContextTokens: 131_072,
  },
};

export function modelCapabilities(adapter: AgentModelAdapter): AgentModelCapabilities {
  return { ...CAPABILITY_MATRIX[adapter] };
}

export function boundedModelContext(
  adapter: AgentModelAdapter,
  requestedTokens?: number,
): number {
  const capabilities = CAPABILITY_MATRIX[adapter];
  if (!Number.isFinite(requestedTokens) || requestedTokens! <= 0) {
    return capabilities.defaultContextTokens;
  }
  return Math.min(Math.floor(requestedTokens!), capabilities.maxContextTokens);
}
