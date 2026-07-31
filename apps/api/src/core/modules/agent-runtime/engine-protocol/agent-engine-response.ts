import type { AgentMcpError } from "../contracts/agent-domain-contracts.ts";

interface AgentEngineResponseBase {
  id: string;
  requestId: string;
  runId: string;
  toolCallId: string;
  createdAt: string;
}

export interface AgentEngineSuccessResponse extends AgentEngineResponseBase {
  status: "succeeded";
  output: unknown;
}

export interface AgentEngineFailureResponse extends AgentEngineResponseBase {
  status: "failed";
  error: AgentMcpError;
}

export interface AgentEngineCancelledResponse extends AgentEngineResponseBase {
  status: "cancelled";
  reason?: string;
}

export type AgentEngineResponse =
  | AgentEngineSuccessResponse
  | AgentEngineFailureResponse
  | AgentEngineCancelledResponse;
