import type { WorkflowEdge, WorkflowItem } from '@/core/types/workflow.types'
import type { BaseCanvasPoint } from '@/shared/base-canvas/index.ts'
import { nextConnectionAction } from '../catalog/nodeCapabilityMatcher.ts'
import { getNodeDefinition } from '../catalog/nodeDefinitionRegistry.ts'
import type { WorkflowHandleType } from './workflowCanvasHandles.ts'
import { makeWorkflowEdgePath, type WorkflowEdgePathData } from './workflowCanvasEdges.ts'

export interface WorkflowConnectionHandle {
  nodeId: string
  handleId: string
  type: WorkflowHandleType
}

export interface WorkflowConnectionAction {
  status: 'valid' | 'invalid'
  source?: string
  target?: string
  sourceHandle?: string
  targetHandle?: string
}

export interface WorkflowConnectionHandlePolicy {
  id: string
  cardinality?: 'one' | 'many'
  connectionPolicy?: 'replace' | 'append'
}

export interface WorkflowConnectionEdgeInput {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  now?: number
}

export function createWorkflowConnectionEdge(input: WorkflowConnectionEdgeInput): WorkflowEdge {
  const now = input.now ?? Date.now()
  return {
    id: `e-${input.source}-${input.target}-${now}`,
    source: input.source,
    target: input.target,
    sourceHandle: input.sourceHandle ?? 'source',
    targetHandle: input.targetHandle ?? 'target',
  }
}

export function getWorkflowConnectionPreviewPath(input: {
  source: BaseCanvasPoint
  target: BaseCanvasPoint
}): WorkflowEdgePathData {
  return makeWorkflowEdgePath(input.source, input.target)
}

export function getWorkflowConnectionAction(input: {
  start: WorkflowConnectionHandle
  end: WorkflowConnectionHandle
  targetHandle?: WorkflowConnectionHandlePolicy
  existingEdges?: Array<Pick<WorkflowEdge, 'target' | 'targetHandle'>>
}): WorkflowConnectionAction {
  const sourceHandle = input.start.type === 'source' ? input.start : input.end.type === 'source' ? input.end : null
  const targetHandle = input.start.type === 'target' ? input.start : input.end.type === 'target' ? input.end : null

  if (!sourceHandle || !targetHandle) return { status: 'invalid' }

  const allowed = isWorkflowConnectionAllowed({
    sourceNodeId: sourceHandle.nodeId,
    targetNodeId: targetHandle.nodeId,
    sourceHandleType: sourceHandle.type,
    targetHandleType: targetHandle.type,
    targetHandle: input.targetHandle,
    existingEdges: input.existingEdges,
  })

  if (!allowed) return { status: 'invalid' }

  return {
    status: 'valid',
    source: sourceHandle.nodeId,
    target: targetHandle.nodeId,
    sourceHandle: sourceHandle.handleId,
    targetHandle: targetHandle.handleId,
  }
}

export function isWorkflowConnectionAllowed(input: {
  sourceNodeId: string
  targetNodeId: string
  sourceHandleType: WorkflowHandleType
  targetHandleType: WorkflowHandleType
  targetHandle?: WorkflowConnectionHandlePolicy
  existingEdges?: Array<Pick<WorkflowEdge, 'target' | 'targetHandle'>>
}): boolean {
  if (!input.sourceNodeId || !input.targetNodeId) return false
  if (input.sourceNodeId === input.targetNodeId) return false
  if (input.sourceHandleType !== 'source' || input.targetHandleType !== 'target') return false

  const targetHandle = input.targetHandle ?? {
    id: 'target',
    cardinality: 'many' as const,
    connectionPolicy: 'append' as const,
  }
  const connectionCount = input.existingEdges?.filter((edge) =>
    edge.target === input.targetNodeId &&
    (edge.targetHandle ?? 'target') === targetHandle.id,
  ).length ?? 0

  return getWorkflowConnectionPolicyAction(targetHandle, connectionCount) !== 'blocked'
}

export function getWorkflowConnectionPolicyAction(
  targetHandle: WorkflowConnectionHandlePolicy,
  connectionCount: number,
): 'append' | 'replace' | 'blocked' {
  return nextConnectionAction(targetHandle as Parameters<typeof nextConnectionAction>[0], connectionCount)
}

export function getWorkflowTargetHandlePolicy(
  workflow: WorkflowItem | null,
  targetNodeId: string,
  targetHandleId: string,
): WorkflowConnectionHandlePolicy {
  const targetNode = workflow?.nodes[targetNodeId]
  const targetType = targetNode?.type
  const handle = getNodeDefinition(targetType)?.handles.find((candidate) =>
    candidate.type === 'target' && candidate.id === targetHandleId,
  )

  return handle ?? {
    id: targetHandleId || 'target',
    cardinality: targetHandleId === 'target' || !targetHandleId ? 'many' : 'one',
    connectionPolicy: targetHandleId === 'target' || !targetHandleId ? 'append' : undefined,
  }
}

export function getAdvancedNodeHandlersForCanvas(workflow: WorkflowItem | null, nodeId: string) {
  const node = workflow?.nodes[nodeId]
  return getNodeDefinition(node?.type)?.handles.filter((handle) => handle.type === 'target') ?? []
}
