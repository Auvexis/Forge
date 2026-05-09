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
])

// Node type visual metadata — color and category hints.
// Full definitions (renderer, editor, handles) live in the node-system feature.
export const NODE_TYPE_META: Record<
  WorkflowNodeType,
  { label: string; color: string; category: string }
> = {
  trigger: {
    label: 'Trigger',
    color: 'var(--nod8-node-trigger)',
    category: 'trigger',
  },
  plugin: {
    label: 'Plugin',
    color: 'var(--nod8-node-plugin)',
    category: 'integration',
  },
  code: {
    label: 'Code',
    color: 'var(--nod8-node-code)',
    category: 'data',
  },
  if: {
    label: 'Condition',
    color: 'var(--nod8-node-logic)',
    category: 'logic',
  },
  loop: {
    label: 'Loop',
    color: 'var(--nod8-node-flow)',
    category: 'flow',
  },
  subworkflow: {
    label: 'Sub-Workflow',
    color: 'var(--nod8-node-plugin)',
    category: 'flow',
  },
  http: {
    label: 'HTTP Request',
    color: 'var(--nod8-node-http)',
    category: 'integration',
  },
  event: {
    label: 'Emit Event',
    color: 'var(--nod8-node-integration)',
    category: 'flow',
  },
  'event-listener': {
    label: 'Event Listener',
    color: 'var(--nod8-node-integration)',
    category: 'trigger',
  },
  set: {
    label: 'Set Fields',
    color: 'var(--nod8-node-set-icon)',
    category: 'data',
  },
  switch: {
    label: 'Switch',
    color: 'var(--nod8-node-switch-icon)',
    category: 'logic',
  },
  merge: {
    label: 'Merge',
    color: 'var(--nod8-node-merge-icon)',
    category: 'flow',
  },
  'split-in-batches': {
    label: 'Split In Batches',
    color: 'var(--nod8-node-split-icon)',
    category: 'flow',
  },
  'respond-webhook': {
    label: 'Respond to Webhook',
    color: 'var(--nod8-node-respond-webhook-icon)',
    category: 'output',
  },
  'wait-form': {
    label: 'Wait for Form',
    color: '#22c55e',
    category: 'flow',
  },
}
