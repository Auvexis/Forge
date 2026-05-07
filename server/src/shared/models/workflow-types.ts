// ──────────── Node Types ────────────

export type WorkflowNodeType =
  | "plugin"
  | "code"
  | "if"
  | "loop"
  | "subworkflow"
  | "trigger"
  | "http"
  | "event"
  | "event-listener"
  | "set"
  | "switch"
  | "merge"
  | "split-in-batches";

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

// ──────────── Sub-Workflow Node (recursive execution) ────────────

export interface SubWorkflowNode extends WorkflowNodeBase {
  type: "subworkflow";
  workflowId: string;
  inputMapping: Record<string, string>; // Maps parent context paths to child trigger payload keys
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

export interface EventNode extends WorkflowNodeBase {
  type: "event";
  eventName: string; // The internal event name to emit (e.g. "video.processed")
  payloadMapping: Record<string, string>; // Maps event payload keys to template expressions
  // Example: { "videoId": "{{ steps.upload.output.videoId }}" }
}

// ──────────── Event Listener Node (Sub-Trigger) ────────────

export interface EventListenerNode extends WorkflowNodeBase {
  type: "event-listener";
  eventName: string; // The internal event name to listen for
}

// ──────────── Trigger Node (entry point — stored for UI metadata only) ────────────

export interface TriggerNode extends WorkflowNodeBase {
  type: "trigger";
}

// ──────────── Set Node (rename / inject fields without JS) ────────────

export interface SetNodeAssignment {
  key: string;    // Target key to write in context output
  value: string;  // Template expression or literal value
}

export interface SetNode extends WorkflowNodeBase {
  type: "set";
  assignments: SetNodeAssignment[];
}

// ──────────── Switch Node (N-way routing based on expression) ────────────

export interface SwitchNodeCase {
  value: string;    // Expected value to match against inputExpression result
  handleId: string; // Source handle id that this case activates (e.g. "case_0")
}

export interface SwitchNode extends WorkflowNodeBase {
  type: "switch";
  inputExpression: string;       // JS expression evaluated against context
  cases: SwitchNodeCase[];       // Ordered list of match cases
  fallbackHandleId?: string;     // Handle activated when no case matches
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
  /** JS expression resolving to an array in context (e.g. "trigger.body.items") */
  collection: string;
  /** Items per batch. Must be > 0. */
  batchSize: number;
  /** Safety cap: max number of batches to process. Defaults to 100. */
  maxBatches?: number;
}

// ──────────── Discriminated Union ────────────

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
  | SplitInBatchesNode;

// ──────────── Edges ────────────

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // "then" | "else" for IfNode, "loop-body" | "loop-done" for LoopNode
  targetHandle?: string;
  condition?: string; // Optional expression (legacy support)
}

// ──────────── Workflow Variables ────────────

export interface WorkflowVariable {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
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

// ──────────── Trigger ────────────

export interface WorkflowTrigger {
  type: "manual" | "webhook" | "cron" | "event" | "plugin";
  schema?: Record<string, any>;
  ui?: WorkflowNodeUI;
  // Webhook config
  webhookPath?: string;   // Auto-generated unique path segment (fallback)
  webhookSlug?: string;   // User-defined readable slug, e.g. 'nova-venda' → /webhook/nova-venda
  webhookMethods?: ("GET" | "POST" | "PUT" | "DELETE")[];
  webhookSecret?: string; // HMAC-SHA256 secret for signature verification
  webhookBodySchema?: Record<string, WebhookBodyField>; // Expected body shape (docs + optional validation)
  // Cron config
  cronExpression?: string;
  // Internal event config
  eventName?: string;
  // Plugin trigger config
  pluginId?: string;      // ID of the plugin that owns this trigger
  triggerName?: string;   // Key in plugin.manifest.triggers (e.g. "onMessage")
  triggerParams?: Record<string, any>; // User-configured params for the trigger
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
