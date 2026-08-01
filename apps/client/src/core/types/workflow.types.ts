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
  | 'call-workflow'
  | 'return'
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
  | 'text-dataset'
  | 'file-dataset'
  | 'database-dataset'
  | 'embeddings'
  | 'vector-store'
  | 'retriever'
  | 'basic-llm-chain'
  | 'structured-json-parser'
  | 'vector-store-retriever'
  | 'question-answer-chain'
  | 'vector-store-tool'

export type AgentMemoryScope = 'none' | 'session' | 'workflow' | 'profile' | 'user'
export type AgentMemoryAdapter = 'fabric-internal' | 'plugin-memory-store'

export type AgentModelAdapter = 'openai-compatible' | 'openrouter' | 'generic' | 'ollama'
export type AgentExecutionMode = 'loop'
export type CallableWorkflowTriggerType = 'manual' | 'form' | 'webhook'
export type WorkflowReturnMode = 'all-steps' | 'fields' | 'expression'
export type WorkflowResultSourceType = 'return' | 'fallback-steps'
export type DatasetSourceType = 'text' | 'file' | 'database'
export type VectorDistanceMetric = 'cosine' | 'dot' | 'euclidean'
export type VectorStoreMethodId =
  | 'ensureCollection'
  | 'upsertDocuments'
  | 'querySimilar'
  | 'deleteDocuments'
  | 'describeCollection'

export type AgentToolSideEffect =
  | 'read'
  | 'write'
  | 'delete'
  | 'external-message'
  | 'external-payment'
  | 'filesystem'

export interface CallableWorkflowTriggerMetadata {
  id: string
  name: string
  type: CallableWorkflowTriggerType
  icon?: string
  schema?: Record<string, any>
  returns?: Array<{ key: string; type?: string }>
}

export interface WorkflowResultSource {
  type: WorkflowResultSourceType
  nodeId?: string
}

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

// ── Call Workflow Node ───────────────────────────────────────

export interface CallWorkflowNode extends WorkflowNodeBase {
  type: 'call-workflow'
  targetWorkflowId: string
  targetWorkflowName?: string
  targetTriggerId: string
  targetTrigger?: CallableWorkflowTriggerMetadata
  toolName: string
  toolDescription?: string
  inputDefaults?: Record<string, any>
  timeoutMs?: number
  requiresApproval?: boolean
}

export interface ReturnNodeField {
  key: string
  value: string
}

export interface ReturnNode extends WorkflowNodeBase {
  type: 'return'
  mode: WorkflowReturnMode
  fields?: ReturnNodeField[]
  expression?: string
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
  maxToolCalls: number
  /** Retry budget for transient/rate-limit tool failures only. */
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
  numCtx?: number
  topP?: number
  topK?: number
  repeatPenalty?: number
  seed?: number
  keepAlive?: string | number
  ollamaOptions?: Record<string, any>
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

export interface DatasetItem {
  id: string
  text: string
  metadata: Record<string, any>
  raw?: any
}

export interface DatasetOutput {
  items: DatasetItem[]
  count: number
  sourceType: DatasetSourceType
}

export interface VectorDocument {
  id: string
  text: string
  vector: number[]
  metadata: Record<string, any>
}

export interface VectorQuery {
  text?: string
  vector?: number[]
  topK: number
  filter?: Record<string, any>
  scoreThreshold?: number
}

export interface VectorSearchResult {
  id: string
  text: string
  score: number
  metadata: Record<string, any>
}

export interface VectorCollectionInfo {
  name: string
  dimension: number
  metric: VectorDistanceMetric
  documentCount?: number
}

export interface VectorStoreProviderConfig {
  collectionName: string
  dimension: number
  metric: VectorDistanceMetric
  config: Record<string, any>
}

export interface VectorStoreEnsureCollectionInput {
  store: VectorStoreProviderConfig
}

export interface VectorStoreUpsertDocumentsInput {
  store: VectorStoreProviderConfig
  documents: VectorDocument[]
}

export interface VectorStoreQuerySimilarInput {
  store: VectorStoreProviderConfig
  query: VectorQuery
}

export interface VectorStoreDeleteDocumentsInput {
  store: VectorStoreProviderConfig
  ids: string[]
}

export interface VectorStoreDescribeCollectionInput {
  store: VectorStoreProviderConfig
}

export interface DatasetChunkingConfig {
  enabled: boolean
  chunkSize: number
  chunkOverlap: number
  contextualOverlapEnabled: boolean
  maxPreviousContextChars?: number
}

export interface TextDatasetNode extends WorkflowNodeBase {
  type: 'text-dataset'
  text: string
  format: 'plain-text' | 'json-array'
  chunking: DatasetChunkingConfig
  metadata?: Record<string, any>
}

export type FileDatasetFile = string | {
  filename: string
  content: string
  mimeType?: string
  size?: number
}

export interface FileDatasetNode extends WorkflowNodeBase {
  type: 'file-dataset'
  files?: FileDatasetFile[]
  filePath?: string
  fileUrl?: string
  format: 'txt' | 'markdown' | 'json' | 'csv' | 'auto'
  jsonMode?: 'all' | 'specific'
  jsonPath?: string
  textTemplate?: string
  includeRootFieldsAsContext?: boolean
  chunking: DatasetChunkingConfig
  metadata?: Record<string, any>
}

export interface DatabaseDatasetNode extends WorkflowNodeBase {
  type: 'database-dataset'
  pluginId: string
  methodId: string
  query: string
  textColumns: string[]
  metadataColumns?: string[]
  limit?: number
  chunking: DatasetChunkingConfig
}

export interface EmbeddingsNode extends WorkflowNodeBase {
  type: 'embeddings'
  pluginId: string
  methodId: string
  model: string
  dimension?: number
  input: string
  batchSize?: number
}

export interface VectorStoreNode extends WorkflowNodeBase {
  type: 'vector-store'
  embeddingCount?: number
  documentCount?: number
  retrievalMode?: 'index' | 'query' | 'index-and-query'
  query?: string
  topK?: number
  outputMode?: 'items' | 'context'
  maxContextChars?: number
  filter?: Record<string, any>
  pluginId: string
  ensureCollectionMethodId: string
  upsertMethodId: string
  queryMethodId: string
  deleteMethodId?: string
  describeMethodId?: string
  collectionName: string
  dimension: number
  metric: VectorDistanceMetric
  config: Record<string, any>
}

export interface RetrieverNode extends WorkflowNodeBase {
  type: 'retriever'
  query: string
  topK: number
  scoreThreshold?: number
  outputMode: 'items' | 'context'
  maxContextChars?: number
  filter?: Record<string, any>
}

export interface BasicLlmChainNode extends WorkflowNodeBase {
  type: 'basic-llm-chain'
  prompt: string
  input: string
}

export interface StructuredJsonParserNode extends WorkflowNodeBase {
  type: 'structured-json-parser'
  schema: Record<string, unknown>
  strict: boolean
  failurePolicy: 'error'
}

export interface VectorStoreRetrieverNode extends WorkflowNodeBase {
  type: 'vector-store-retriever'
  topK: number
  scoreThreshold?: number
  filter?: Record<string, unknown>
  maxContextChars: number
}

export interface QuestionAnswerChainNode extends WorkflowNodeBase {
  type: 'question-answer-chain'
  question: string
  instructions?: string
}

export interface VectorStoreToolNode extends WorkflowNodeBase {
  type: 'vector-store-tool'
  toolName: string
  description: string
  topK: number
  scoreThreshold?: number
  instructions?: string
}

// ── Discriminated Union ──────────────────────────────────────

export type WorkflowNode =
  | PluginNode
  | CodeNode
  | IfNode
  | LoopNode
  | CallWorkflowNode
  | ReturnNode
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
  | TextDatasetNode
  | FileDatasetNode
  | DatabaseDatasetNode
  | EmbeddingsNode
  | VectorStoreNode
  | RetrieverNode
  | BasicLlmChainNode
  | StructuredJsonParserNode
  | VectorStoreRetrieverNode
  | QuestionAnswerChainNode
  | VectorStoreToolNode

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
  migrationVersion?: string
  migrationNotes?: string[]
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
