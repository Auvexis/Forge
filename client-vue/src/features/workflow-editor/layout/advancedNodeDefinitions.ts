import { Position } from '@vue-flow/core'
import type { WorkflowNodeType } from '@/core/types/workflow.types'
import type { BaseNodeHandlerDefinition, NodeSide } from '../components/nodePresentation.types'

export const AI_AGENT_HANDLERS: BaseNodeHandlerDefinition[] = [
  { id: 'chatModel', label: 'Chat Model', type: 'target', position: Position.Bottom, style: 'diamond', required: true, quickAdd: 'agent-config', allowedNodes: ['capability:chat-model'] },
  { id: 'memory', label: 'Memory', type: 'target', position: Position.Bottom, style: 'diamond', quickAdd: 'agent-config', allowedNodes: ['preset:sqlite-memory', 'capability:memory-store'] },
  { id: 'tool', label: 'Tool', type: 'target', position: Position.Bottom, style: 'diamond', quickAdd: 'agent-config', quickAddAfterConnected: true, allowedNodes: ['capability:agent-tool'] },
]

export const VECTOR_STORE_HANDLERS: BaseNodeHandlerDefinition[] = [
  { id: 'embedding', label: 'Embedding', type: 'target', position: Position.Bottom, style: 'diamond', required: true, quickAdd: 'vector-config', allowedNodes: ['capability:embedding-provider', 'node:embeddings'] },
  { id: 'document', label: 'Document', type: 'target', position: Position.Bottom, style: 'diamond', quickAdd: 'vector-config', quickAddAfterConnected: true, allowedNodes: ['node:text-dataset', 'node:file-dataset', 'node:database-dataset'] },
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
  return nodeType ? ADVANCED_NODE_HANDLERS[nodeType as WorkflowNodeType] ?? [] : []
}

export function sideFromPosition(position: Position): NodeSide {
  if (position === Position.Top) return 'top'
  if (position === Position.Bottom) return 'bottom'
  if (position === Position.Right) return 'right'
  return 'left'
}
