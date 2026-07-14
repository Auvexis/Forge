import type { NodeExecutionStatus, WorkflowExecutionStatus } from '@/core/types/execution.types'
import type { WorkflowResultSourceType } from '@/core/types/workflow.types'

export interface ExecutionRunTreeNode {
  id: string
  nodeId: string
  parentId: string | null
  kind?: 'node' | 'error' | 'group'
  name: string
  type: string
  icon: string
  iconColor: string
  avatar?: string
  status: NodeExecutionStatus
  startedAt?: number
  endedAt?: number
  durationMs: number | null
  input?: unknown
  output?: unknown
  error?: string
  attempts?: number
  retries?: Array<{ attempt: number; delayMs: number; error?: string; at: number }>
  children: ExecutionRunTreeNode[]
}

export interface ExecutionNodePresentation {
  icon: string
  iconColor: string
}

export interface ExecutionRunFinalResult {
  label: string
  sourceType: WorkflowResultSourceType
  nodeId?: string
  value: unknown
}

export interface ExecutionRunDetailModel {
  id: string
  workflowId: string
  status: WorkflowExecutionStatus
  startedAt: number
  endedAt: number | null
  durationMs: number | null
  finalResult?: ExecutionRunFinalResult
  roots: ExecutionRunTreeNode[]
  nodesById: Record<string, ExecutionRunTreeNode | undefined>
}
