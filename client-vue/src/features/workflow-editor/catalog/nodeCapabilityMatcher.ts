import type { WorkflowNodeCatalogItem, WorkflowNodeHandleDefinition } from '@/core/types/workflow-node-catalog.types'

type CandidateIdentity = WorkflowNodeCatalogItem & { providerId?: string; methodId?: string }

export function matchesNodeDefinition(
  handle: WorkflowNodeHandleDefinition,
  candidate: CandidateIdentity,
  identity: { candidateId?: string; consumerId?: string } = {},
): boolean {
  if (identity.candidateId && identity.candidateId === identity.consumerId) return false
  const capabilityMatch = !handle.accepts?.length || handle.accepts.some((selector) =>
    candidate.capabilities.includes(selector.capability) &&
    (!selector.providerId || selector.providerId === candidate.providerId) &&
    (!selector.methodId || selector.methodId === candidate.methodId),
  )
  if (!capabilityMatch) return false
  if (!handle.allowedNodes || handle.allowedNodes === '*') return true
  return handle.allowedNodes.includes(`node:${candidate.type}`) ||
    Boolean(candidate.providerId && handle.allowedNodes.includes(`plugin:${candidate.providerId}`)) ||
    candidate.capabilities.some((capability) => handle.allowedNodes!.includes(`capability:${capability}`))
}

export function shouldShowQuickAdd(handle: WorkflowNodeHandleDefinition, connectionCount: number): boolean {
  if (!handle.quickAdd) return false
  return connectionCount === 0 || handle.quickAddAfterConnected === true
}

export function nextConnectionAction(
  handle: WorkflowNodeHandleDefinition,
  connectionCount: number,
): 'append' | 'replace' | 'blocked' {
  if (connectionCount === 0) return handle.connectionPolicy === 'append' ? 'append' : 'replace'
  if (handle.cardinality === 'many' && handle.connectionPolicy === 'append') return 'append'
  if (handle.cardinality === 'one' && handle.connectionPolicy === 'replace') return 'replace'
  return 'blocked'
}
