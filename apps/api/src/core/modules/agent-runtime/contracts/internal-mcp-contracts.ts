import type { AgentMcpError } from "./agent-domain-contracts.ts";

export const INTERNAL_MCP_PROTOCOL_VERSION = "1" as const;

export interface InternalMcpEnvelope<TMethod extends string, TPayload> {
  protocolVersion: typeof INTERNAL_MCP_PROTOCOL_VERSION;
  requestId: string;
  method: TMethod;
  payload: TPayload;
}

export type InternalMcpListToolsRequest = InternalMcpEnvelope<"tools/list", Record<string, never>>;

export type InternalMcpDescribeToolRequest = InternalMcpEnvelope<
  "tools/describe",
  { name: string }
>;

export type InternalMcpCallToolRequest = InternalMcpEnvelope<
  "tools/call",
  {
    runId: string;
    actionId: string;
    toolCallId: string;
    name: string;
    arguments: Record<string, unknown>;
  }
>;

export interface InternalMcpSuccess<T> {
  ok: true;
  requestId: string;
  result: T;
}

export interface InternalMcpFailure {
  ok: false;
  requestId: string;
  error: AgentMcpError;
}

export type InternalMcpResponse<T> = InternalMcpSuccess<T> | InternalMcpFailure;
