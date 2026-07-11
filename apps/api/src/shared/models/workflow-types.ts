// ──────────── Node Types ────────────

export type WorkflowNodeType =
  | "plugin"
  | "code"
  | "if"
  | "loop"
  | "call-workflow"
  | "return"
  | "trigger"
  | "http"
  | "event"
  | "event-listener"
  | "set"
  | "switch"
  | "merge"
  | "split-in-batches"
  | "respond-webhook"
  | "wait-form"
  | "ai-agent"
  | "ai-model"
  | "ai-memory"
  | "ai-tool"
  | "text-dataset"
  | "file-dataset"
  | "database-dataset"
  | "embeddings"
  | "vector-store"
  | "retriever"
  | "basic-llm-chain"
  | "structured-json-parser"
  | "vector-store-retriever"
  | "question-answer-chain"
  | "vector-store-tool";

export type AgentMemoryScope = "none" | "session" | "workflow" | "profile" | "user";
export type AgentMemoryAdapter = "fabric-internal" | "plugin-memory-store";

export type AgentModelAdapter = "openai-compatible" | "generic" | "ollama";
export type AgentExecutionMode = "loop" | "plan";
export type CallableWorkflowTriggerType = "manual" | "form" | "webhook";
export type WorkflowReturnMode = "all-steps" | "fields" | "expression";
export type WorkflowResultSourceType = "return" | "fallback-steps";
export type DatasetSourceType = "text" | "file" | "database";
export type VectorDistanceMetric = "cosine" | "dot" | "euclidean";
export type VectorStoreMethodId =
  | "ensureCollection"
  | "upsertDocuments"
  | "querySimilar"
  | "deleteDocuments"
  | "describeCollection";

export type AgentToolSideEffect =
  | "read"
  | "write"
  | "delete"
  | "external-message"
  | "external-payment"
  | "filesystem";

export interface CallableWorkflowTriggerMetadata {
  id: string;
  name: string;
  type: CallableWorkflowTriggerType;
  icon?: string;
  schema?: Record<string, any>;
}

export interface WorkflowResultSource {
  type: WorkflowResultSourceType;
  nodeId?: string;
}

export interface DatasetItem {
  id: string;
  text: string;
  metadata: Record<string, any>;
  raw?: any;
}

export type FileExtractFormat = "txt" | "markdown" | "json" | "csv";

export interface FileExtractItem {
  id: string;
  format: FileExtractFormat;
  source: Record<string, any>;
  rawText: string;
  rows?: Array<Record<string, any>>;
  data?: unknown;
}

export interface DatasetOutput {
  items: DatasetItem[];
  count: number;
  sourceType: DatasetSourceType;
  files?: FileExtractItem[];
}

export interface VectorDocument {
  id: string;
  text: string;
  vector: number[];
  metadata: Record<string, any>;
}

export interface VectorQuery {
  text?: string;
  vector?: number[];
  topK: number;
  filter?: Record<string, any>;
  scoreThreshold?: number;
}

export interface VectorSearchResult {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, any>;
}

export interface VectorCollectionInfo {
  name: string;
  dimension: number;
  metric: VectorDistanceMetric;
  documentCount?: number;
}

export interface VectorStoreProviderConfig {
  collectionName: string;
  dimension: number;
  metric: VectorDistanceMetric;
  config: Record<string, any>;
}

export interface VectorStoreEnsureCollectionInput {
  store: VectorStoreProviderConfig;
}

export interface VectorStoreUpsertDocumentsInput {
  store: VectorStoreProviderConfig;
  documents: VectorDocument[];
}

export interface VectorStoreQuerySimilarInput {
  store: VectorStoreProviderConfig;
  query: VectorQuery;
}

export interface VectorStoreDeleteDocumentsInput {
  store: VectorStoreProviderConfig;
  ids: string[];
}

export interface VectorStoreDescribeCollectionInput {
  store: VectorStoreProviderConfig;
}

// ──────────── Retry Policy ────────────

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: "fixed" | "linear" | "exponential";
  intervalSeconds: number;
}

// ──────────── UI Metadata ────────────

export interface WorkflowNodeUI {
  positionX: number;
  positionY: number;
  icon?: string;
  collapsed?: boolean;
  width?: number;
  height?: number;
}

// ──────────── Base Node ────────────

interface WorkflowNodeBase {
  type: WorkflowNodeType;
  name: string;
  disabled?: boolean;
  retryPolicy?: RetryPolicy;
  ui?: WorkflowNodeUI;
}

// ──────────── Plugin Node (existing behavior) ────────────

export interface PluginNode extends WorkflowNodeBase {
  type: "plugin";
  pluginId: string;
  action: string;
  params: Record<string, any>;
}

// ──────────── Code Node (sandbox script) ────────────

export interface CodeNode extends WorkflowNodeBase {
  type: "code";
  language: "javascript";
  script: string;
}

// ──────────── If/Else Node (conditional branching) ────────────

export interface IfNode extends WorkflowNodeBase {
  type: "if";
  condition: string; // JS expression evaluated against context, e.g. "steps.step1.output.status === 200"
}

// ──────────── Loop Node (iterate over collection) ────────────

export interface LoopNode extends WorkflowNodeBase {
  type: "loop";
  collection: string; // Template expression pointing to an array, e.g. "{{ steps.fetch.output.items }}"
  maxIterations: number; // Safety limit to prevent infinite loops
}

// ──────────── Call Workflow Node ────────────

export interface CallWorkflowNode extends WorkflowNodeBase {
  type: "call-workflow";
  targetWorkflowId: string;
  targetWorkflowName?: string;
  targetTriggerId: string;
  targetTrigger?: CallableWorkflowTriggerMetadata;
  toolName: string;
  toolDescription?: string;
  inputDefaults?: Record<string, any>;
  timeoutMs?: number;
  requiresApproval?: boolean;
}

export interface ReturnNodeField {
  key: string;
  value: string;
}

export interface ReturnNode extends WorkflowNodeBase {
  type: "return";
  mode: WorkflowReturnMode;
  fields?: ReturnNodeField[];
  expression?: string;
}

// ──────────── HTTP Request Node ────────────

export interface HttpNode extends WorkflowNodeBase {
  type: "http";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string; // Supports template expressions: "https://api.example.com/{{ steps.prev.output.id }}"
  headers?: Record<string, string>; // Key-value pairs, values support templates
  body?: string; // Raw body string, supports templates
  bodyType?: "json" | "form" | "raw"; // How to encode the body
  timeout?: number; // Request timeout in ms (default: 30000)
  followRedirects?: boolean; // Follow 3xx redirects (default: true)
  responseType?: "json" | "text" | "binary"; // How to parse the response body
}

// ──────────── Emit Event Node ────────────

export interface EventNodeParam {
  key: string;
  value: string;
}

export interface EventNode extends WorkflowNodeBase {
  type: "event";
  eventName: string; // The internal event name to emit (e.g. "video.processed")
  payloadParams: EventNodeParam[]; // Structured key-value pairs forwarded as the event payload
}

// ──────────── Event Listener Node (Sub-Trigger) ────────────

export interface EventListenerOutputParam {
  key: string; // Field name exposed to downstream nodes via steps.<id>.output.<key>
}

export interface EventListenerNode extends WorkflowNodeBase {
  type: "event-listener";
  eventName: string; // The internal event name to listen for
  outputParams?: EventListenerOutputParam[]; // Declared output fields captured from the incoming event payload
}

// ──────────── Trigger Node (entry point — stored for UI metadata only) ────────────

export interface TriggerNode extends WorkflowNodeBase {
  type: "trigger";
  trigger?: WorkflowTrigger;
}

// ──────────── Set Node (rename / inject fields without JS) ────────────

export interface SetNodeAssignment {
  key: string; // Target key to write in context output
  value: string; // Template expression or literal value
}

export interface SetNode extends WorkflowNodeBase {
  type: "set";
  assignments: SetNodeAssignment[];
}

// ──────────── Switch Node (N-way routing based on expression) ────────────

export interface SwitchNodeCase {
  value: string; // Expected value to match against inputExpression result
  handleId: string; // Source handle id that this case activates (e.g. "case_0")
}

export interface SwitchNode extends WorkflowNodeBase {
  type: "switch";
  inputExpression: string; // JS expression evaluated against context
  cases: SwitchNodeCase[]; // Ordered list of match cases
  fallbackHandleId?: string; // Handle activated when no case matches
}

// ──────────── Merge Node (converge parallel branches) ────────────

export interface MergeNode extends WorkflowNodeBase {
  type: "merge";
  /**
   * wait-any: execute as soon as the first branch arrives (default BFS behavior)
   * wait-all: block until ALL in-degree predecessors have delivered output
   */
  mode: "wait-any" | "wait-all";
}

// ──────────── Split In Batches Node ────────────

export interface SplitInBatchesNode extends WorkflowNodeBase {
  type: "split-in-batches";
  collection: string;
  batchSize: number;
  maxBatches?: number;
}

// ──────────── Respond To Webhook Node ────────────

export interface RespondToWebhookNode extends WorkflowNodeBase {
  type: "respond-webhook";
  /** HTTP status code to return (default 200) */
  statusCode: number;
  /** Response body — supports {{ template }} expressions */
  body: string;
  /** Optional response headers as key-value pairs */
  headers?: Record<string, string>;
}

export interface WaitFormNode extends WorkflowNodeBase {
  type: "wait-form";
  title: string;
  description?: string;
  publicSlug?: string;
  fields: FormTriggerField[];
  theme?: FormTheme;
  expiresInSeconds?: number | string;
}

export interface AiAgentNode extends WorkflowNodeBase {
  type: "ai-agent";
  agentDisplayName?: string;
  agentEmoji?: string;
  prompt: string;
  inputMessage?: string;
  executionMode?: AgentExecutionMode;
  maxIterations: number;
  maxToolCalls: number;
  maxRetriesPerTool?: number;
  timeoutMs: number;
  requireApprovalForSideEffects: AgentToolSideEffect[];
  outputMode: "text" | "json";
  outputSchema?: Record<string, any>;
}

export interface AiModelNode extends WorkflowNodeBase {
  type: "ai-model";
  pluginId: string;
  adapter: AgentModelAdapter;
  model: string;
  temperature: number;
  maxTokens?: number;
  numCtx?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  seed?: number;
  keepAlive?: string | number;
  ollamaOptions?: Record<string, any>;
  credentialId?: string;
  baseUrl?: string;
  thinkingEnabled?: boolean;
  thinkingRequest?: Record<string, any>;
  thinkingSupported?: boolean;
}

export interface AiMemoryNode extends WorkflowNodeBase {
  type: "ai-memory";
  scope: AgentMemoryScope;
  readEnabled: boolean;
  writeEnabled: boolean;
  maxRetrievedMemories: number;
  maxMemoryChars: number;
  adapter?: AgentMemoryAdapter;
  pluginId?: string;
  searchMethodId?: string;
  putMethodId?: string;
}

export interface AiToolNode extends WorkflowNodeBase {
  type: "ai-tool";
  pluginId: string;
  methodId: string;
  descriptionOverride?: string;
  timeoutMs: number;
  requiresApproval: boolean;
  sideEffect: AgentToolSideEffect;
  inputDefaults?: Record<string, any>;
}

export interface DatasetChunkingConfig {
  enabled: boolean;
  chunkSize: number;
  chunkOverlap: number;
  contextualOverlapEnabled: boolean;
  maxPreviousContextChars?: number;
}

export interface TextDatasetNode extends WorkflowNodeBase {
  type: "text-dataset";
  text: string;
  format: "plain-text" | "json-array";
  chunking: DatasetChunkingConfig;
  metadata?: Record<string, any>;
}

export type FileDatasetFile = string | {
  filename: string;
  content: string;
  mimeType?: string;
  size?: number;
};

export interface FileDatasetNode extends WorkflowNodeBase {
  type: "file-dataset";
  files?: FileDatasetFile[];
  filePath?: string;
  fileUrl?: string;
  format: "txt" | "markdown" | "json" | "csv" | "auto";
  jsonMode?: "all" | "specific";
  jsonPath?: string;
  textTemplate?: string;
  includeRootFieldsAsContext?: boolean;
  chunking: DatasetChunkingConfig;
  metadata?: Record<string, any>;
}

export interface DatabaseDatasetNode extends WorkflowNodeBase {
  type: "database-dataset";
  pluginId: string;
  methodId: string;
  query: string;
  textColumns: string[];
  metadataColumns?: string[];
  limit?: number;
  chunking: DatasetChunkingConfig;
}

export interface EmbeddingsNode extends WorkflowNodeBase {
  type: "embeddings";
  pluginId: string;
  methodId: string;
  model: string;
  dimension?: number;
  input: string;
  batchSize?: number;
}

export interface VectorStoreNode extends WorkflowNodeBase {
  type: "vector-store";
  embeddingCount?: number;
  documentCount?: number;
  retrievalMode?: "index" | "query" | "index-and-query";
  query?: string;
  topK?: number;
  outputMode?: "items" | "context";
  maxContextChars?: number;
  filter?: Record<string, any>;
  pluginId: string;
  ensureCollectionMethodId: string;
  upsertMethodId: string;
  queryMethodId: string;
  deleteMethodId?: string;
  describeMethodId?: string;
  collectionName: string;
  dimension: number;
  metric: VectorDistanceMetric;
  config: Record<string, any>;
}

export interface RetrieverNode extends WorkflowNodeBase {
  type: "retriever";
  query: string;
  topK: number;
  scoreThreshold?: number;
  outputMode: "items" | "context";
  maxContextChars?: number;
  filter?: Record<string, any>;
}

export interface BasicLlmChainNode extends WorkflowNodeBase {
  type: "basic-llm-chain";
  prompt: string;
  input: string;
}

export interface StructuredJsonParserNode extends WorkflowNodeBase {
  type: "structured-json-parser";
  schema: Record<string, unknown>;
  strict: boolean;
  failurePolicy: "error";
}

export interface VectorStoreRetrieverNode extends WorkflowNodeBase {
  type: "vector-store-retriever";
  topK: number;
  scoreThreshold?: number;
  filter?: Record<string, unknown>;
  maxContextChars: number;
}

export interface QuestionAnswerChainNode extends WorkflowNodeBase {
  type: "question-answer-chain";
  question: string;
  instructions?: string;
}

export interface VectorStoreToolNode extends WorkflowNodeBase {
  type: "vector-store-tool";
  toolName: string;
  description: string;
  topK: number;
  scoreThreshold?: number;
  instructions?: string;
}

// ──────────── Discriminated Union ────────────

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
  | VectorStoreToolNode;

// ──────────── Edges ────────────

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // "then" | "else" for IfNode, "loop-body" | "loop-done" for LoopNode
  targetHandle?: string;
  condition?: string; // Optional expression (legacy support)
  /** Display label shown on the canvas edge — UI only, ignored by executor. */
  label?: string;
}

// ──────────── Workflow Variables ────────────

export interface WorkflowVariable {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "secret";
  defaultValue?: any;
  description?: string;
}

// ──────────── Webhook Body Schema ────────────

/**
 * Describes a single field in the expected webhook request body.
 * Used for documentation and optional strict validation.
 */
export interface WebhookBodyField {
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  description?: string;
}

// ──────────── Form Trigger Field ────────────

/**
 * Describes a single field rendered on the public Form Trigger page.
 * The Fabric server hosts a minimal HTML page at GET /forms/:workflowId
 * built from this list. Submitting the form posts to /forms/:workflowId/submit
 * and that POST handler kicks off the workflow as the trigger payload.
 */
export interface FormTriggerField {
  name: string; // Field key sent in the trigger payload (snake_case or kebab-case)
  label: string; // Human-readable label rendered in the form
  type:
    | "text"
    | "email"
    | "number"
    | "textarea"
    | "date"
    | "password"
    | "file"
    | "select"
    | "multiselect"
    | "checkbox"
    | "checkbox-group"
    | "radio"
    | "quiz"
    | "tel"
    | "url";
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: Array<{ label: string; value: string }>;
  accept?: string; // Allowed mime types or extensions, e.g., "image/*, .pdf"
  maxSize?: number; // Maximum file size in megabytes (MB)
}

export interface FormTheme {
  preset?: string; // Frontend-owned theme identifier.
  layout?: "floating" | "flat" | "full-width" | "centered";
  background?: {
    type?: "solid" | "gradient" | "image";
    color?: string;
    gradient?: string;
    imageUrl?: string;
  };
  container?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    radius?: number;
    shadow?: "none" | "sm" | "md" | "lg";
    maxWidth?: number;
    padding?: number;
  };
  button?: {
    width?: "auto" | "full";
    shape?: "square" | "medium" | "pill";
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    hoverBackgroundColor?: string;
  };
  typography?: {
    fontFamily?: string;
    titleFontFamily?: string;
    subtitleFontFamily?: string;
    buttonFontFamily?: string;
    inputFontFamily?: string;
    baseSize?: number;
    weight?: number;
    titleColor?: string;
    subtitleColor?: string;
  };
  fields?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    focusColor?: string;
    radius?: number;
    shape?: "square" | "medium" | "pill";
    spacing?: number;
  };
}

// ──────────── Trigger ────────────

export interface WorkflowTrigger {
  type: "manual" | "webhook" | "cron" | "plugin" | "form" | "chat";
  schema?: Record<string, any>;
  ui?: WorkflowNodeUI;
  // Webhook config
  webhookPath?: string; // Auto-generated unique path segment (fallback)
  webhookSlug?: string; // User-defined readable slug, e.g. 'nova-venda' → /webhook/nova-venda
  webhookMethods?: ("GET" | "POST" | "PUT" | "DELETE")[];
  webhookSecret?: string; // HMAC-SHA256 secret for signature verification
  webhookBodySchema?: Record<string, WebhookBodyField>; // Expected body shape (docs + optional validation)
  // Cron config
  cronExpression?: string;
  // Plugin trigger config
  pluginId?: string; // ID of the plugin that owns this trigger
  triggerName?: string; // Key in plugin.manifest.triggers (e.g. "onMessage")
  triggerParams?: Record<string, any>; // User-configured params for the trigger
  // Form trigger config
  formSlug?: string; // Optional readable public ID, e.g. 'contact-us' -> /forms/contact-us
  formTitle?: string; // Title rendered at the top of the public form page
  formDescription?: string; // Optional description shown below the title
  formFields?: FormTriggerField[];
  formTheme?: FormTheme;
  // Chat trigger config
  chatSlug?: string;
  chatTitle?: string;
  chatAuthMode?: "public" | "signed" | "profile";
  chatSessionMode?: "new-session-per-user" | "resume-by-session-id";
  chatAllowedOrigins?: string[];
  chatRateLimitPerMinute?: number;
  // Captured payload from "Listen for Event" UX (persisted so left pane can display it)
  lastTriggerPayload?: Record<string, any> | null;
}

// ──────────── Metadata ────────────

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  isActive: boolean;
  isDraft: boolean;
  public: boolean;
  autosaveEnabled?: boolean;
  migrationVersion?: string;
  migrationNotes?: string[];
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null; // ISO timestamp of last intentional publish action; null when unpublished
}

// ──────────── Root Payload ────────────

export interface WorkflowItem {
  metadata: WorkflowMetadata;
  trigger: WorkflowTrigger;
  nodes: Record<string, WorkflowNode>;
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
}
