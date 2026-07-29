export type AgentRunState =
  | "routing"
  | "running"
  | "waiting-user"
  | "waiting-approval"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentActionState =
  | "pending"
  | "ready"
  | "running"
  | "waiting-user"
  | "waiting-approval"
  | "completed"
  | "failed"
  | "skipped";

export interface AgentRunRecord {
  id: string;
  profileId: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  sessionId?: string;
  userMessage: string;
  state: AgentRunState;
  version: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AgentActionRecord {
  id: string;
  runId: string;
  toolName: string;
  objective: string;
  dependsOn: string[];
  state: AgentActionState;
  arguments?: Record<string, unknown>;
  output?: unknown;
  version: number;
}

export interface AgentToolCallRecord {
  id: string;
  runId: string;
  actionId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  status: "pending" | "running" | "succeeded" | "failed";
  result?: unknown;
  error?: AgentMcpError;
}

export type AgentPendingInteractionKind =
  | "clarification"
  | "selection"
  | "approval"
  | "authentication"
  | "permission";

export interface AgentPendingInteraction {
  id: string;
  runId: string;
  actionId?: string;
  kind: AgentPendingInteractionKind;
  question: string;
  context: Record<string, unknown>;
  status: "pending" | "resolved" | "cancelled";
}

export interface AgentArtifactRef {
  ref: `artifact://${string}`;
  profileId: string;
  name: string;
  mimeType?: string;
  size: number;
}

export interface AgentArtifactRecord extends AgentArtifactRef {
  id: string;
  runId: string;
  actionId?: string;
  storageKey: string;
  sha256: string;
  createdAt: string;
  expiresAt: string;
}

export type AgentMcpErrorCategory =
  | "validation"
  | "not-found"
  | "ambiguous"
  | "authentication"
  | "permission"
  | "rate-limit"
  | "temporary"
  | "policy"
  | "internal";

export interface AgentMcpError {
  code: string;
  category: AgentMcpErrorCategory;
  message: string;
  retryable: boolean;
  userActionRequired: boolean;
  details?: Record<string, unknown>;
}
