import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";
import type { AgentEventType } from "../../agent-runtime/agent-types.ts";

export type DevWorkflowSessionStatus =
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "failed";

export type WorkflowJobStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

export type WorkflowJobSource =
  | "manual"
  | "webhook"
  | "form"
  | "cron"
  | "chat"
  | "event"
  | "plugin";

export interface WorkflowJob {
  id: string;
  sessionId: string;
  workflowId: string;
  triggerNodeId: string;
  executionId: string;
  status: WorkflowJobStatus;
  source: WorkflowJobSource;
  payload: unknown;
  queuedAt: number;
  startedAt?: number;
  endedAt?: number;
  error?: string;
}

export interface DevWorkflowSession {
  id: string;
  workflowId: string;
  profileId?: string;
  workflow: WorkflowItem;
  status: DevWorkflowSessionStatus;
  createdAt: number;
  updatedAt: number;
  stoppedAt?: number;
  stopReason?: string;
  triggerRuntimes: DevTriggerRuntimeHandle[];
}

export interface DevTriggerRuntimeHandle {
  triggerNodeId: string;
  type: WorkflowJobSource;
  teardown: () => void | Promise<void>;
}

export type SessionEventType =
  | "session:start"
  | "session:ready"
  | "trigger:waiting"
  | "trigger:received"
  | "job:queued"
  | "job:start"
  | "node:start"
  | "node:success"
  | "node:failed"
  | AgentEventType
  | "job:success"
  | "job:failed"
  | "job:cancelled"
  | "session:stopping"
  | "session:stopped";

export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  workflowId: string;
  timestamp: number;
  executionId?: string;
  triggerNodeId?: string;
  nodeId?: string;
  jobId?: string;
  source?: WorkflowJobSource;
  data?: unknown;
  error?: string;
}

const sessionTransitions: Record<DevWorkflowSessionStatus, DevWorkflowSessionStatus[]> = {
  starting: ["running", "stopping", "stopped", "failed"],
  running: ["stopping", "stopped", "failed"],
  stopping: ["stopped", "failed"],
  stopped: [],
  failed: [],
};

const jobTransitions: Record<WorkflowJobStatus, WorkflowJobStatus[]> = {
  queued: ["running", "cancelled", "failed"],
  running: ["success", "failed", "cancelled"],
  success: [],
  failed: [],
  cancelled: [],
};

export function canTransitionSession(
  from: DevWorkflowSessionStatus,
  to: DevWorkflowSessionStatus,
): boolean {
  return from === to || sessionTransitions[from].includes(to);
}

export function assertValidSessionTransition(
  from: DevWorkflowSessionStatus,
  to: DevWorkflowSessionStatus,
): void {
  if (!canTransitionSession(from, to)) {
    throw new Error(`Invalid dev workflow session transition: ${from} -> ${to}`);
  }
}

export function canTransitionJob(
  from: WorkflowJobStatus,
  to: WorkflowJobStatus,
): boolean {
  return from === to || jobTransitions[from].includes(to);
}

export function assertValidJobTransition(
  from: WorkflowJobStatus,
  to: WorkflowJobStatus,
): void {
  if (!canTransitionJob(from, to)) {
    throw new Error(`Invalid workflow job transition: ${from} -> ${to}`);
  }
}
