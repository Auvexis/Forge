// ──────────── Node Types ────────────

export type WorkflowNodeType =
  | "plugin"
  | "code"
  | "if"
  | "loop"
  | "subworkflow"
  | "trigger"
  | "http"
  | "event";

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

// ──────────── Plugin Node ────────────

export interface PluginNode extends WorkflowNodeBase {
  type: "plugin";
  pluginId: string;
  action: string;
  params: Record<string, any>;
}

// ──────────── Code Node ────────────

export interface CodeNode extends WorkflowNodeBase {
  type: "code";
  language: "javascript";
  script: string;
}

// ──────────── If/Else Node ────────────

export interface IfNode extends WorkflowNodeBase {
  type: "if";
  condition: string;
}

// ──────────── Loop Node ────────────

export interface LoopNode extends WorkflowNodeBase {
  type: "loop";
  collection: string;
  maxIterations: number;
}

// ──────────── Sub-Workflow Node ────────────

export interface SubWorkflowNode extends WorkflowNodeBase {
  type: "subworkflow";
  workflowId: string;
  inputMapping: Record<string, string>;
}

// ──────────── HTTP Request Node ────────────

export interface HttpNode extends WorkflowNodeBase {
  type: "http";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: "json" | "form" | "raw";
  timeout?: number;
  followRedirects?: boolean;
  responseType?: "json" | "text";
}

// ──────────── Emit Event Node ────────────

export interface EventNode extends WorkflowNodeBase {
  type: "event";
  eventName: string;
  payloadMapping: Record<string, string>;
}

// ──────────── Trigger Node ────────────

export interface TriggerNode extends WorkflowNodeBase {
  type: "trigger";
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
  | EventNode;

// ──────────── Edges ────────────

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
}

// ──────────── Workflow Variables ────────────

export interface WorkflowVariable {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  defaultValue?: any;
  description?: string;
}

// ──────────── Trigger ────────────

export interface WorkflowTrigger {
  type: "manual" | "webhook" | "cron" | "event";
  schema?: Record<string, any>;
  ui?: WorkflowNodeUI;
  // Webhook
  webhookPath?: string;
  webhookMethods?: ("GET" | "POST" | "PUT" | "DELETE")[];
  webhookSecret?: string;
  // Cron
  cronExpression?: string;
  // Event
  eventName?: string;
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
}

// ──────────── Root Payload ────────────

export interface WorkflowItem {
  metadata: WorkflowMetadata;
  trigger: WorkflowTrigger;
  nodes: Record<string, WorkflowNode>;
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
}
