// ─────────────────────────────────────────────────────────────
//  Workflow Types — mirrors server/src/shared/models/workflow-types.ts
//  Frontend-owned copy; aligned to the backend contract.
// ─────────────────────────────────────────────────────────────

// ── Node Types ───────────────────────────────────────────────

export type WorkflowNodeType =
  | 'plugin'
  | 'code'
  | 'if'
  | 'loop'
  | 'subworkflow'
  | 'trigger'
  | 'http'
  | 'event'
  | 'event-listener'
  | 'set'
  | 'switch'
  | 'merge'
  | 'split-in-batches'

// ── Retry Policy ─────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number
  backoffStrategy: 'fixed' | 'linear' | 'exponential'
  intervalSeconds: number
}

// ── UI Metadata ──────────────────────────────────────────────

export interface WorkflowNodeUI {
  positionX: number
  positionY: number
  icon?: string
  collapsed?: boolean
  width?: number
  height?: number
}

// ── Base Node ────────────────────────────────────────────────

interface WorkflowNodeBase {
  type: WorkflowNodeType
  name: string
  retryPolicy?: RetryPolicy
  ui?: WorkflowNodeUI
}

// ── Plugin Node ──────────────────────────────────────────────

export interface PluginNode extends WorkflowNodeBase {
  type: 'plugin'
  pluginId: string
  action: string
  params: Record<string, unknown>
}

// ── Code Node ────────────────────────────────────────────────

export interface CodeNode extends WorkflowNodeBase {
  type: 'code'
  language: 'javascript'
  script: string
}

// ── If Node ──────────────────────────────────────────────────

export interface IfNode extends WorkflowNodeBase {
  type: 'if'
  condition: string
}

// ── Loop Node ────────────────────────────────────────────────

export interface LoopNode extends WorkflowNodeBase {
  type: 'loop'
  collection: string
  maxIterations: number
}

// ── SubWorkflow Node ─────────────────────────────────────────

export interface SubWorkflowNode extends WorkflowNodeBase {
  type: 'subworkflow'
  workflowId: string
  inputMapping: Record<string, string>
}

// ── HTTP Node ────────────────────────────────────────────────

export interface HttpNode extends WorkflowNodeBase {
  type: 'http'
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: string
  bodyType?: 'json' | 'form' | 'raw'
  timeout?: number
  followRedirects?: boolean
  responseType?: 'json' | 'text'
}

// ── Event Node ───────────────────────────────────────────────

export interface EventNode extends WorkflowNodeBase {
  type: 'event'
  eventName: string
  payloadMapping: Record<string, string>
}

// ── Event Listener Node ──────────────────────────────────────

export interface EventListenerNode extends WorkflowNodeBase {
  type: 'event-listener'
  eventName: string
}

// ── Trigger Node ─────────────────────────────────────────────

export interface TriggerNode extends WorkflowNodeBase {
  type: 'trigger'
}

// ── Set Node ─────────────────────────────────────────────────

export interface SetNodeAssignment {
  key: string
  value: string
}

export interface SetNode extends WorkflowNodeBase {
  type: 'set'
  assignments: SetNodeAssignment[]
}

// ── Switch Node ───────────────────────────────────────────────

export interface SwitchNodeCase {
  value: string
  handleId: string
}

export interface SwitchNode extends WorkflowNodeBase {
  type: 'switch'
  inputExpression: string
  cases: SwitchNodeCase[]
  fallbackHandleId?: string
}

// ── Merge Node ─────────────────────────────────────────────────

export interface MergeNode extends WorkflowNodeBase {
  type: 'merge'
  mode: 'wait-any' | 'wait-all'
}

// ── Split In Batches Node ──────────────────────────────────

export interface SplitInBatchesNode extends WorkflowNodeBase {
  type: 'split-in-batches'
  collection: string
  batchSize: number
  maxBatches?: number
}

// ── Discriminated Union ──────────────────────────────────────

export type WorkflowNode =
  | PluginNode
  | CodeNode
  | IfNode
  | LoopNode
  | SubWorkflowNode
  | TriggerNode
  | HttpNode
  | EventNode
  | EventListenerNode
  | SetNode
  | SwitchNode
  | MergeNode
  | SplitInBatchesNode

// ── Edges ────────────────────────────────────────────────────

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  condition?: string
}

// ── Variables ────────────────────────────────────────────────

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: unknown
  description?: string
}

// ── Trigger Schema Field ─────────────────────────────────────

export interface WorkflowSchemaField {
  type: 'string' | 'number' | 'file'
  required: boolean
}

// ── Webhook Body Field ────────────────────────────────

export interface WebhookBodyField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required?: boolean
  description?: string
}

// ── Trigger ───────────────────────────────────────

export interface WorkflowTrigger {
  type: 'manual' | 'webhook' | 'cron' | 'event' | 'plugin'
  schema?: Record<string, WorkflowSchemaField>
  ui?: WorkflowNodeUI
  webhookPath?: string
  webhookSlug?: string
  webhookMethods?: ('GET' | 'POST' | 'PUT' | 'DELETE')[]
  webhookSecret?: string
  webhookBodySchema?: Record<string, WebhookBodyField>
  cronExpression?: string
  eventName?: string
  // Plugin trigger fields
  pluginId?: string
  triggerName?: string
  triggerParams?: Record<string, any>
  // Last captured webhook payload from "Listen for Event"
  lastTriggerPayload?: Record<string, any> | null
}

// ── Metadata ───────────────────────────────────────

export interface WorkflowMetadata {
  id: string
  name: string
  description?: string
  version: string
  isActive: boolean
  isDraft: boolean
  public: boolean
  createdAt: string
  updatedAt?: string
  publishedAt?: string
}

// ── Root Payload ─────────────────────────────────────────────

export interface WorkflowItem {
  metadata: WorkflowMetadata
  trigger: WorkflowTrigger
  nodes: Record<string, WorkflowNode>
  edges: WorkflowEdge[]
  variables?: WorkflowVariable[]
}
