// ─────────────────────────────────────────────────────────────
//  Node Type Constants
// ─────────────────────────────────────────────────────────────

import type { WorkflowNodeType } from '../types/workflow.types'

export const VALID_NODE_TYPES = new Set<WorkflowNodeType>([
  'plugin',
  'code',
  'if',
  'loop',
  'subworkflow',
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
])

// Node type visual metadata — color and category hints.
// Full definitions (renderer, editor, handles) live in the node-system feature.
export const NODE_TYPE_META: Record<
  WorkflowNodeType,
  { label: string; color: string; category: string }
> = {
  trigger: {
    label: 'Trigger',
    color: 'var(--sailor-node-trigger)',
    category: 'trigger',
  },
  plugin: {
    label: 'Plugin',
    color: 'var(--sailor-node-plugin)',
    category: 'integration',
  },
  code: {
    label: 'Code',
    color: 'var(--sailor-node-code)',
    category: 'data',
  },
  if: {
    label: 'Condition',
    color: 'var(--sailor-node-logic)',
    category: 'logic',
  },
  loop: {
    label: 'Loop',
    color: 'var(--sailor-node-flow)',
    category: 'flow',
  },
  subworkflow: {
    label: 'Sub-Workflow',
    color: 'var(--sailor-node-plugin)',
    category: 'flow',
  },
  http: {
    label: 'HTTP Request',
    color: 'var(--sailor-node-http)',
    category: 'integration',
  },
  event: {
    label: 'Emit Event',
    color: 'var(--sailor-node-integration)',
    category: 'flow',
  },
  'event-listener': {
    label: 'Event Listener',
    color: 'var(--sailor-node-integration)',
    category: 'trigger',
  },
  set: {
    label: 'Set Fields',
    color: 'var(--sailor-node-set-icon)',
    category: 'data',
  },
  switch: {
    label: 'Switch',
    color: 'var(--sailor-node-switch-icon)',
    category: 'logic',
  },
  merge: {
    label: 'Merge',
    color: 'var(--sailor-node-merge-icon)',
    category: 'flow',
  },
  'split-in-batches': {
    label: 'Split In Batches',
    color: 'var(--sailor-node-split-icon)',
    category: 'flow',
  },
  'respond-webhook': {
    label: 'Respond to Webhook',
    color: 'var(--sailor-node-respond-webhook-icon)',
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
}
