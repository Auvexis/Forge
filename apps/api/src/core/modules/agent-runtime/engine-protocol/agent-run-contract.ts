export const AGENT_ENGINE_PROTOCOL_VERSION = 1 as const;

export type AgentRunStatus =
  | "queued"
  | "deciding"
  | "waiting-tool"
  | "waiting-interaction"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentRunStopReason =
  | "final-response"
  | "interaction-required"
  | "tool-requested"
  | "iteration-limit"
  | "tool-call-limit"
  | "model-error"
  | "tool-error"
  | "cancelled";

export interface AgentRunContract {
  protocolVersion: typeof AGENT_ENGINE_PROTOCOL_VERSION;
  runId: string;
  profileId: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  sessionId?: string;
  turnId?: string;
  status: AgentRunStatus;
  iterationCount: number;
  toolCallCount: number;
  stopReason?: AgentRunStopReason;
  createdAt: string;
  updatedAt: string;
}
