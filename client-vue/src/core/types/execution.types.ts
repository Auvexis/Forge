// ─────────────────────────────────────────────────────────────
//  Execution Types — SSE events + execution log shapes
// ─────────────────────────────────────────────────────────────

// ── SSE Event Types (mirrors server event-bus.ts) ─────────────

export type WorkflowEventType =
  | 'node:start'
  | 'node:success'
  | 'node:failed'
  | 'workflow:start'
  | 'workflow:success'
  | 'workflow:failed'
  | 'workflow:cancelled'

export interface WorkflowEvent {
  executionId: string
  workflowId: string
  type: WorkflowEventType
  nodeId?: string
  timestamp: number
  data?: unknown
  error?: string
}

// ── Node Execution Status ─────────────────────────────────────

export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'failed'

export interface NodeExecutionState {
  status: NodeExecutionStatus
  output?: unknown
  error?: string
  startedAt?: number
  endedAt?: number
}

// ── Workflow Execution Status ─────────────────────────────────

export type WorkflowExecutionStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'

// ── Execution Log (from GET /workflows/:id/executions) ────────

export interface ExecutionLog {
  id: string
  workflowId: string
  status: WorkflowExecutionStatus
  startedAt: number
  endedAt: number | null
  context: {
    trigger?: unknown
    steps?: Record<string, { status: string; output?: unknown; error?: string }>
    variables?: Record<string, unknown>
  }
}

// ── Active Execution State ────────────────────────────────────

export interface ActiveExecution {
  executionId: string
  workflowId: string
  status: WorkflowExecutionStatus
  startedAt: number
}
