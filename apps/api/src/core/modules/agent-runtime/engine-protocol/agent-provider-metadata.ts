export type AgentProviderId =
  | "ollama"
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | (string & {});

export interface AgentProviderContinuationMetadata {
  provider: AgentProviderId;
  formatVersion: number;
  payload: Record<string, unknown>;
}

export function isAgentProviderContinuationMetadata(
  value: unknown,
): value is AgentProviderContinuationMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.provider === "string" &&
    Number.isInteger(record.formatVersion) &&
    Boolean(record.payload) &&
    typeof record.payload === "object" &&
    !Array.isArray(record.payload);
}
