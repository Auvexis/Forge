// ─────────────────────────────────────────────────────────────
//  Execution Types — SSE events + execution log shapes
// ─────────────────────────────────────────────────────────────

// ── SSE Event Types (mirrors server event-bus.ts) ─────────────

export type WorkflowEventType =
  | 'session:start'
  | 'session:ready'
  | 'session:stopping'
  | 'session:stopped'
  | 'trigger:waiting'
  | 'trigger:received'
  | 'job:queued'
  | 'job:start'
  | 'job:success'
  | 'job:failed'
  | 'job:cancelled'
  | 'node:start'
  | 'node:retry'
  | 'node:success'
  | 'node:failed'
  | 'workflow:start'
  | 'workflow:success'
  | 'workflow:failed'
  | 'workflow:cancelled'
  | 'temporary-form:created'
  | 'agent:start'
  | 'agent:model-start'
  | 'agent:model-end'
  | 'agent:output-delta'
  | 'agent:tool-start'
  | 'agent:tool-end'
  | 'agent:memory-read'
  | 'agent:memory-write'
  | 'agent:approval-created'
  | 'agent:approval-resumed'
  | 'agent:error'
  | 'agent:end'
  | 'trigger:data'   // emitted after form submission with the serializable trigger payload

export interface WorkflowEvent {
  executionId?: string
  workflowId: string
  type: WorkflowEventType
  sessionId?: string
  jobId?: string
  triggerNodeId?: string
  source?: string
  nodeId?: string
  timestamp: number
  data?: unknown
  error?: string
}

// ── Node Execution Status ─────────────────────────────────────

export type NodeExecutionStatus = 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'

export interface NodeExecutionState {
  status: NodeExecutionStatus
  output?: unknown
  error?: string
  startedAt?: number
  endedAt?: number
  attempts?: number
  retries?: Array<{ attempt: number; delayMs: number; error?: string; at: number }>
}

// ── Workflow Execution Status ─────────────────────────────────

export type WorkflowExecutionStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
export type DevWorkflowSessionStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed'

// ── Execution Log (from GET /workflows/:id/executions) ────────

export interface ExecutionLog {
  id: string
  workflowId: string
  status: WorkflowExecutionStatus
  startedAt: number
  endedAt: number | null
  context: {
    trigger?: unknown
    steps?: Record<
      string,
      {
        status: string
        output?: unknown
        error?: string
        startedAt?: number
        endedAt?: number
        attempts?: number
        retries?: Array<{ attempt: number; delayMs: number; error?: string; at: number }>
        logs?: unknown
      }
    >
    variables?: Record<string, unknown>
  }
}

export interface ExecutionTimelineEvent {
  id: string
  type: WorkflowEventType
  nodeId?: string
  triggerNodeId?: string
  jobId?: string
  source?: string
  executionId?: string
  timestamp: number
  status: 'running' | 'success' | 'failed' | 'retrying' | 'cancelled' | 'info'
  label: string
  description?: string
  delayMs?: number
  attempt?: number
  payload?: unknown
  error?: string
}

// ── Active Execution State ────────────────────────────────────

export interface ActiveExecution {
  executionId: string
  workflowId: string
  status: WorkflowExecutionStatus
  startedAt: number
}
