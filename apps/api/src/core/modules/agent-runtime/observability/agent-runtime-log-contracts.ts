export type AgentRuntimeLogLevel = "debug" | "info" | "warn" | "error";

export type AgentRuntimeLogEvent =
  | "run.started"
  | "run.completed"
  | "run.failed"
  | "intent.classified"
  | "action.preparing"
  | "action.waiting_user"
  | "action.completed"
  | "tool.call_started"
  | "tool.call_completed"
  | "tool.call_failed"
  | "interaction.created"
  | "interaction.resolved"
  | "approval.requested"
  | "approval.resumed";

export interface AgentRuntimeLogContext {
  profileId: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  runId?: string;
  sessionId?: string;
  actionId?: string;
  toolCallId?: string;
  toolName?: string;
}

export interface AgentRuntimeLogEntry {
  timestamp: string;
  level: AgentRuntimeLogLevel;
  event: AgentRuntimeLogEvent;
  context: AgentRuntimeLogContext;
  data?: Record<string, unknown>;
}
