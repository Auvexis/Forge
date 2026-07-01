import { Position } from '../components/nodePresentation.types'
import type { WorkflowNodeType } from '@/core/types/workflow.types'
import type { AllowedNodes, BaseNodeHandlerDefinition, NodeSide } from '../components/nodePresentation.types'
import { getNodeDefinition } from '../catalog/nodeDefinitionRegistry'

export const AI_AGENT_HANDLERS: BaseNodeHandlerDefinition[] = [
  { id: 'chatModel', label: 'Chat Model', type: 'target', position: Position.Bottom, style: 'diamond', required: true, quickAdd: 'agent-config', allowedNodes: ['capability:chat-model'] },
  { id: 'memory', label: 'Memory', type: 'target', position: Position.Bottom, style: 'diamond', quickAdd: 'agent-config', allowedNodes: ['preset:sqlite-memory', 'capability:memory-store'] },
  { id: 'tool', label: 'Tool', type: 'target', position: Position.Bottom, style: 'diamond', quickAdd: 'agent-config', quickAddAfterConnected: true, allowedNodes: ['capability:agent-tool'] },
]

export const VECTOR_STORE_HANDLERS: BaseNodeHandlerDefinition[] = [
  { id: 'embedding', label: 'Embedding', type: 'target', position: Position.Bottom, style: 'diamond', required: true, quickAdd: 'vector-config', allowedNodes: ['capability:embedding-model'] },
  { id: 'document', label: 'Document', type: 'target', position: Position.Bottom, style: 'diamond', quickAdd: 'vector-config', quickAddAfterConnected: true, allowedNodes: ['node:file-dataset', 'node:text-dataset', 'node:database-dataset'] },
]

export const CONFIGURATION_SOURCE_HANDLER: BaseNodeHandlerDefinition = {
  id: 'source',
  label: '',
  type: 'source',
  position: Position.Top,
  style: 'diamond',
  allowedNodes: [],
}

const ADVANCED_NODE_HANDLERS: Partial<Record<WorkflowNodeType, BaseNodeHandlerDefinition[]>> = {
  'ai-agent': AI_AGENT_HANDLERS,
  'vector-store': VECTOR_STORE_HANDLERS,
}

export function getAdvancedNodeHandlers(nodeType: WorkflowNodeType | string | undefined): BaseNodeHandlerDefinition[] {
  const catalogHandlers = getNodeDefinition(nodeType)?.handles.map((handler) => ({
    ...handler,
    position: handler.position === 'top' ? Position.Top : handler.position === 'right' ? Position.Right : handler.position === 'bottom' ? Position.Bottom : Position.Left,
    allowedNodes: (handler.allowedNodes ?? handler.accepts?.map(({ capability }) => `capability:${capability}`) ?? []) as AllowedNodes,
  }))
  return catalogHandlers?.length ? catalogHandlers : nodeType ? ADVANCED_NODE_HANDLERS[nodeType as WorkflowNodeType] ?? [] : []
}

export function sideFromPosition(position: Position): NodeSide {
  if (position === Position.Top) return 'top'
  if (position === Position.Bottom) return 'bottom'
  if (position === Position.Right) return 'right'
  return 'left'
}
