export type AgentEngineRequestStatus =
  | "queued"
  | "leased"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentEngineToolRequest {
  kind: "tool";
  id: string;
  idempotencyKey: string;
  runId: string;
  iteration: number;
  toolCallId: string;
  actionId: string;
  toolName: string;
  pluginId?: string;
  methodId?: string;
  arguments: Record<string, unknown>;
  status: AgentEngineRequestStatus;
  providerMetadata?: AgentProviderContinuationMetadata;
  createdAt: string;
  updatedAt: string;
}

export type AgentEngineRequest = AgentEngineToolRequest;
import type { AgentProviderContinuationMetadata } from "./agent-provider-metadata.ts";
