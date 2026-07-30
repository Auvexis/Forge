import type { AgentMcpError } from "../contracts/agent-domain-contracts.ts";

export type AgentSessionState = "active" | "archived";

export type AgentTurnState =
  | "queued"
  | "running"
  | "waiting-user"
  | "waiting-approval"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentMessageRole = "user" | "assistant" | "system";

export interface AgentSession {
  id: string;
  profileId: string;
  workflowId: string;
  triggerNodeId: string;
  title: string;
  state: AgentSessionState;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTurn {
  id: string;
  sessionId: string;
  runId?: string;
  state: AgentTurnState;
  sequence: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  turnId: string;
  role: AgentMessageRole;
  sequence: number;
  createdAt: string;
  completedAt?: string;
}

export interface AgentPartBase {
  id: string;
  sessionId: string;
  turnId: string;
  messageId: string;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTextPart extends AgentPartBase {
  type: "text";
  text: string;
  state: "streaming" | "completed";
}

export interface AgentToolPendingState {
  status: "pending";
  input?: unknown;
}

export interface AgentToolRunningState {
  status: "running";
  input: Record<string, unknown>;
  startedAt: string;
  attempt: number;
}

export interface AgentToolCompletedState {
  status: "completed";
  input: Record<string, unknown>;
  output: unknown;
  startedAt: string;
  completedAt: string;
  attempt: number;
}

export interface AgentToolErrorState {
  status: "error";
  input: Record<string, unknown>;
  error: AgentMcpError;
  startedAt?: string;
  completedAt: string;
  attempt: number;
}

export type AgentToolPartState =
  | AgentToolPendingState
  | AgentToolRunningState
  | AgentToolCompletedState
  | AgentToolErrorState;

export interface AgentToolPart extends AgentPartBase {
  type: "tool";
  callId: string;
  actionId?: string;
  toolName: string;
  state: AgentToolPartState;
}

export interface AgentArtifactPart extends AgentPartBase {
  type: "artifact";
  artifactRef: `artifact://${string}`;
  name: string;
  mimeType?: string;
  size: number;
}

export interface AgentInteractionPart extends AgentPartBase {
  type: "interaction";
  interactionId: string;
  kind: "clarification" | "selection" | "approval" | "authentication" | "permission";
  question: string;
  state: "pending" | "resolved" | "cancelled";
  response?: unknown;
}

export interface AgentErrorPart extends AgentPartBase {
  type: "error";
  error: AgentMcpError;
}

export interface AgentCompactionPart extends AgentPartBase {
  type: "compaction";
  summary: string;
  firstMessageSequence: number;
  lastMessageSequence: number;
}

export interface AgentCommitmentPart extends AgentPartBase {
  type: "commitment";
  request: string;
  items: Array<{
    id: string;
    description: string;
    status: "pending" | "completed" | "failed";
    evidencePartIds: string[];
  }>;
}

export type AgentMessagePart =
  | AgentTextPart
  | AgentToolPart
  | AgentArtifactPart
  | AgentInteractionPart
  | AgentErrorPart
  | AgentCompactionPart
  | AgentCommitmentPart;

export interface AgentMessageWithParts {
  message: AgentMessage;
  parts: AgentMessagePart[];
}

export interface AgentSessionSnapshot {
  session: AgentSession;
  activeTurn: AgentTurn | null;
  messages: AgentMessageWithParts[];
  pendingInteraction: AgentInteractionPart | null;
  revision: number;
}

export function isTerminalTurnState(state: AgentTurnState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}

export function isTerminalToolState(state: AgentToolPartState): boolean {
  return state.status === "completed" || state.status === "error";
}
