export type AgentInteractionKind =
  | "clarification"
  | "selection"
  | "approval"
  | "authentication"
  | "permission";

export type AgentInteractionStatus = "pending" | "resolved" | "cancelled";

export interface AgentInteractionRequest {
  id: string;
  runId: string;
  requestId?: string;
  actionId?: string;
  kind: AgentInteractionKind;
  question: string;
  options?: Array<{ value: string; label: string; description?: string }>;
  context: Record<string, unknown>;
  status: AgentInteractionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgentInteractionResponse {
  interactionId: string;
  value: unknown;
  respondedAt: string;
}
