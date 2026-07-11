// ─────────────────────────────────────────────────────────────
//  Node Type Constants
// ─────────────────────────────────────────────────────────────

import type { WorkflowNodeType } from '../types/workflow.types'

export const VALID_NODE_TYPES = new Set<WorkflowNodeType>([
  'plugin',
  'code',
  'if',
  'loop',
  'call-workflow',
  'return',
  'trigger',
  'http',
  'event',
  'event-listener',
  'set',
  'switch',
  'merge',
  'split-in-batches',
  'respond-webhook',
  'wait-form',
  'ai-agent',
  'ai-model',
  'ai-memory',
  'ai-tool',
  'text-dataset',
  'file-dataset',
  'database-dataset',
  'embeddings',
  'vector-store',
  'retriever',
  'basic-llm-chain',
  'structured-json-parser',
  'vector-store-retriever',
  'question-answer-chain',
  'vector-store-tool',
])

// Node type visual metadata — color and category hints.
// Full definitions (renderer, editor, handles) live in the node-system feature.
export const NODE_TYPE_META: Record<
  WorkflowNodeType,
  { label: string; color: string; category: string }
> = {
  trigger: {
    label: 'Trigger',
    color: 'var(--fabric-node-trigger)',
    category: 'trigger',
  },
  plugin: {
    label: 'Plugin',
    color: 'var(--fabric-node-plugin)',
    category: 'integration',
  },
  code: {
    label: 'Code',
    color: 'var(--fabric-node-code)',
    category: 'data',
  },
  if: {
    label: 'Condition',
    color: 'var(--fabric-node-logic)',
    category: 'logic',
  },
  loop: {
    label: 'Loop',
    color: 'var(--fabric-node-flow)',
    category: 'flow',
  },
  'call-workflow': {
    label: 'Call Workflow',
    color: 'var(--fabric-node-plugin)',
    category: 'flow',
  },
  return: {
    label: 'Return',
    color: 'var(--fabric-node-return-icon)',
    category: 'output',
  },
  http: {
    label: 'HTTP Request',
    color: 'var(--fabric-node-http)',
    category: 'integration',
  },
  event: {
    label: 'Emit Event',
    color: 'var(--fabric-node-integration)',
    category: 'flow',
  },
  'event-listener': {
    label: 'Event Listener',
    color: 'var(--fabric-node-integration)',
    category: 'trigger',
  },
  set: {
    label: 'Set Fields',
    color: 'var(--fabric-node-set-icon)',
    category: 'data',
  },
  switch: {
    label: 'Switch',
    color: 'var(--fabric-node-switch-icon)',
    category: 'logic',
  },
  merge: {
    label: 'Merge',
    color: 'var(--fabric-node-merge-icon)',
    category: 'flow',
  },
  'split-in-batches': {
    label: 'Split In Batches',
    color: 'var(--fabric-node-split-icon)',
    category: 'flow',
  },
  'respond-webhook': {
    label: 'Respond to Webhook',
    color: 'var(--fabric-node-respond-webhook-icon)',
    category: 'output',
  },
  'wait-form': {
    label: 'Wait for Form',
    color: '#22c55e',
    category: 'flow',
  },
  'ai-agent': {
    label: 'AI Agent',
    color: 'rgb(14, 165, 233)',
    category: 'ai',
  },
  'ai-model': {
    label: 'AI Model',
    color: 'rgb(16, 185, 129)',
    category: 'ai',
  },
  'ai-memory': {
    label: 'AI Memory',
    color: 'rgb(245, 158, 11)',
    category: 'ai',
  },
  'ai-tool': {
    label: 'AI Tool',
    color: 'rgb(244, 63, 94)',
    category: 'ai',
  },
  'text-dataset': {
    label: 'Text Dataset',
    color: 'var(--fabric-node-set-icon)',
    category: 'data',
  },
  'file-dataset': {
    label: 'Extract From File',
    color: 'var(--fabric-node-http-icon)',
    category: 'data',
  },
  'database-dataset': {
    label: 'Database Dataset',
    color: 'var(--fabric-node-plugin-icon)',
    category: 'data',
  },
  embeddings: {
    label: 'Embeddings',
    color: 'rgb(14, 165, 233)',
    category: 'ai',
  },
  'vector-store': {
    label: 'Vector Store',
    color: 'var(--fabric-node-merge-icon)',
    category: 'ai',
  },
  retriever: {
    label: 'Retriever',
    color: 'var(--fabric-node-if-icon)',
    category: 'ai',
  },
  'basic-llm-chain': {
    label: 'Basic LLM Chain',
    color: '#2563eb',
    category: 'ai',
  },
  'structured-json-parser': {
    label: 'Structured JSON Parser',
    color: '#db2777',
    category: 'ai',
  },
  'vector-store-retriever': {
    label: 'Vector Store Retriever',
    color: '#65a30d',
    category: 'ai',
  },
  'question-answer-chain': {
    label: 'Question and Answer Chain',
    color: '#0891b2',
    category: 'ai',
  },
  'vector-store-tool': {
    label: 'Vector Store Tool',
    color: '#ea580c',
    category: 'ai',
  },
}
