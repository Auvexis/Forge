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
  | 'respond-webhook'
  | 'wait-form'
  | 'ai-agent'
  | 'ai-model'
  | 'ai-memory'
  | 'ai-tool'

export type AgentMemoryScope = 'none' | 'session' | 'workflow' | 'profile' | 'user'
export type AgentMemoryAdapter = 'sailor-internal' | 'plugin-memory-store'

export type AgentModelAdapter = 'openai-compatible' | 'generic' | 'ollama'
export type AgentExecutionMode = 'loop' | 'plan'

export type AgentToolSideEffect =
  | 'read'
  | 'write'
  | 'delete'
  | 'external-message'
  | 'external-payment'
  | 'filesystem'

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
  disabled?: boolean
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

export interface EventNodeParam {
  key: string
  value: string
}

export interface EventNode extends WorkflowNodeBase {
  type: 'event'
  eventName: string
  /** Structured key-value pairs forwarded as the event payload */
  payloadParams: EventNodeParam[]
}

// ── Event Listener Node ──────────────────────────────────────

export interface EventListenerOutputParam {
  /** Field name exposed to downstream nodes via steps.<id>.output.<key> */
  key: string
}

export interface EventListenerNode extends WorkflowNodeBase {
  type: 'event-listener'
  eventName: string
  /** Declared output fields captured from the incoming event payload */
  outputParams?: EventListenerOutputParam[]
}

// ── Trigger Node ─────────────────────────────────────────────

export interface TriggerNode extends WorkflowNodeBase {
  type: 'trigger'
  trigger?: WorkflowTrigger
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

// ── Respond To Webhook Node ───────────────────────────────

export interface RespondToWebhookNode extends WorkflowNodeBase {
  type: 'respond-webhook'
  statusCode: number
  body: string
  headers?: Record<string, string>
}

export interface WaitFormNode extends WorkflowNodeBase {
  type: 'wait-form'
  title: string
  description?: string
  publicSlug?: string
  fields: FormTriggerField[]
  theme?: FormTheme
  expiresInSeconds?: number | string
}

export interface AiAgentNode extends WorkflowNodeBase {
  type: 'ai-agent'
  agentDisplayName?: string
  agentEmoji?: string
  prompt: string
  inputMessage?: string
  executionMode?: AgentExecutionMode
  maxIterations: number
  maxToolCalls: number
  maxRetriesPerTool?: number
  timeoutMs: number
  requireApprovalForSideEffects: AgentToolSideEffect[]
  outputMode: 'text' | 'json'
  outputSchema?: Record<string, any>
  providerCount?: number
  memoryCount?: number
  toolCount?: number
}

export interface AiModelNode extends WorkflowNodeBase {
  type: 'ai-model'
  pluginId: string
  adapter: AgentModelAdapter
  model: string
  temperature: number
  maxTokens?: number
  credentialId?: string
  baseUrl?: string
  thinkingEnabled?: boolean
  thinkingRequest?: Record<string, any>
  thinkingSupported?: boolean
}

export interface AiMemoryNode extends WorkflowNodeBase {
  type: 'ai-memory'
  scope: AgentMemoryScope
  readEnabled: boolean
  writeEnabled: boolean
  maxRetrievedMemories: number
  maxMemoryChars: number
  adapter?: AgentMemoryAdapter
  pluginId?: string
  searchMethodId?: string
  putMethodId?: string
}

export interface AiToolNode extends WorkflowNodeBase {
  type: 'ai-tool'
  pluginId: string
  methodId: string
  descriptionOverride?: string
  timeoutMs: number
  requiresApproval: boolean
  sideEffect: AgentToolSideEffect
  inputDefaults?: Record<string, any>
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
  | RespondToWebhookNode
  | WaitFormNode
  | AiAgentNode
  | AiModelNode
  | AiMemoryNode
  | AiToolNode

// ── Edges ────────────────────────────────────────────────────

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  condition?: string
  /** Display label shown on the canvas edge — UI only, ignored by executor. */
  label?: string
}

// ── Variables ────────────────────────────────────────────────

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'secret'
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

// ── Form Trigger Field ────────────────────────────────

export interface FormTriggerField {
  name: string
  label: string
  type:
    | 'text'
    | 'email'
    | 'number'
    | 'textarea'
    | 'date'
    | 'password'
    | 'file'
    | 'select'
    | 'multiselect'
    | 'checkbox'
    | 'checkbox-group'
    | 'radio'
    | 'quiz'
    | 'tel'
    | 'url'
  required?: boolean
  placeholder?: string
  description?: string
  options?: Array<{ label: string; value: string }>
  accept?: string // Allowed mime types or extensions, e.g. "image/*, .pdf"
  maxSize?: number // Maximum file size in megabytes (MB)
}

export interface FormTheme {
  preset?:
    | 'custom'
    | 'social-media'
    | 'minimal-flat'
    | 'google-forms'
    | 'cyberpunk'
    | 'ocean-breeze'
    | 'sunset'
    | 'forest'
    | 'glass'
  layout?: 'floating' | 'flat' | 'full-width' | 'centered'
  background?: {
    type?: 'solid' | 'gradient' | 'image'
    color?: string
    gradient?: string
    imageUrl?: string
  }
  container?: {
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    radius?: number
    shadow?: 'none' | 'sm' | 'md' | 'lg'
    maxWidth?: number
    padding?: number
  }
  button?: {
    width?: 'auto' | 'full'
    shape?: 'square' | 'medium' | 'pill'
    backgroundColor?: string
    textColor?: string
    borderColor?: string
    hoverBackgroundColor?: string
  }
  typography?: {
    fontFamily?: string
    titleFontFamily?: string
    subtitleFontFamily?: string
    buttonFontFamily?: string
    inputFontFamily?: string
    baseSize?: number
    weight?: number
    titleColor?: string
    subtitleColor?: string
  }
  fields?: {
    backgroundColor?: string
    textColor?: string
    borderColor?: string
    focusColor?: string
    radius?: number
    shape?: 'square' | 'medium' | 'pill'
    spacing?: number
  }
}

// ── Trigger ───────────────────────────────────────

export interface WorkflowTrigger {
  type: 'manual' | 'webhook' | 'cron' | 'plugin' | 'form' | 'chat'
  schema?: Record<string, WorkflowSchemaField>
  ui?: WorkflowNodeUI
  webhookPath?: string
  webhookSlug?: string
  webhookMethods?: ('GET' | 'POST' | 'PUT' | 'DELETE')[]
  webhookSecret?: string
  webhookBodySchema?: Record<string, WebhookBodyField>
  cronExpression?: string
  // Plugin trigger fields
  pluginId?: string
  triggerName?: string
  triggerParams?: Record<string, any>
  // Form trigger fields
  formSlug?: string
  formTitle?: string
  formDescription?: string
  formFields?: FormTriggerField[]
  formTheme?: FormTheme
  // Chat trigger fields
  chatSlug?: string
  chatTitle?: string
  chatAuthMode?: 'public' | 'signed' | 'profile'
  chatSessionMode?: 'new-session-per-user' | 'resume-by-session-id'
  chatAllowedOrigins?: string[]
  chatRateLimitPerMinute?: number
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
  autosaveEnabled?: boolean
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
