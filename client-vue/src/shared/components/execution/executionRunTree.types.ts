import type { NodeExecutionStatus, WorkflowExecutionStatus } from '@/core/types/execution.types'

export interface ExecutionRunTreeNode {
  id: string
  nodeId: string
  parentId: string | null
  name: string
  type: string
  icon: string
  iconColor: string
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

export interface ExecutionRunDetailModel {
  id: string
  workflowId: string
  status: WorkflowExecutionStatus
  startedAt: number
  endedAt: number | null
  durationMs: number | null
  roots: ExecutionRunTreeNode[]
  nodesById: Record<string, ExecutionRunTreeNode | undefined>
}
