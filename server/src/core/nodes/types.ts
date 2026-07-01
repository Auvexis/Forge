import type {
  WorkflowEvent,
} from "../modules/workflows/event-bus.ts";
import type {
  WorkflowEdge,
  WorkflowItem,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowResultSource,
} from "../../shared/models/workflow-types.ts";
import type {
  InternalEvent,
} from "../modules/events/internal-event-bus.ts";
import type {
  WebhookPendingResponse,
} from "../modules/workflows/pending-webhook-registry.ts";
import type { ResolvedConfigDependencies } from "./dependencies/dependency-types.ts";

export interface WorkflowExecutionContext {
  _workflowId?: string;
  _executionId?: string;
  _webhookCorrelationId?: string;
  _event_payloads?: Record<string, any>;
  trigger: any;
  steps: Record<string, any>;
  variables: Record<string, any>;
  result?: unknown;
  resultSource?: WorkflowResultSource;
  env?: Record<string, any>;
}

export interface NodeHandlerInput<TNode extends WorkflowNode = WorkflowNode> {
  nodeId: string;
  node: TNode;
  context: WorkflowExecutionContext;
  workflow: WorkflowItem;
  edges: WorkflowEdge[];
  executionId: string;
  services: NodeHandlerServices;
}

export interface NodeHandlerServices {
  resolveConfigDependencies?: (nodeId: string) => Promise<ResolvedConfigDependencies>;
  executePluginMethod?: (
    pluginId: string,
    methodId: string,
    params: Record<string, any>,
  ) => Promise<any>;
  executeNode: (input: Omit<NodeHandlerInput, "services">) => Promise<any>;
  executeWorkflow: (
    workflow: WorkflowItem,
    triggerPayload: any,
    executionId?: string,
  ) => Promise<any>;
  executeWorkflowFromTrigger?: (
    workflow: WorkflowItem,
    triggerNodeId: string,
    triggerPayload: any,
    executionId?: string,
  ) => Promise<any>;
  getWorkflowById: (workflowId: string) => WorkflowItem | null;
  emitInternalEvent: (event: InternalEvent) => Promise<{ triggered: string[] }>;
  resolvePendingWebhookResponse: (
    correlationId: string,
    response: WebhookPendingResponse,
  ) => boolean;
  emitNodeStart: (nodeId: string) => void;
  emitNodeSuccess: (nodeId: string, result: any, node?: WorkflowNode) => void;
  emitNodeFailure: (nodeId: string, error: Error) => void;
  emitWorkflowEvent?: (event: WorkflowEvent) => void;
}

export interface NodeHandler {
  type: WorkflowNodeType;
  metadata: NodeHandlerMetadata;
  execute: (input: NodeHandlerInput<any>) => Promise<any> | any;
}

export type NodeExecutionKind = "stateless" | "subgraph" | "external-io" | "long-running";
export type NodeSideEffect =
  | "none"
  | "context-write"
  | "workflow-dispatch"
  | "event-emit"
  | "webhook-response"
  | "network";

export interface NodeOutputHandle {
  id: string;
  label: string;
}

export interface NodeHandlerMetadata {
  description: string;
  execution: NodeExecutionKind;
  sideEffects: NodeSideEffect[];
  inputs?: string[];
  outputs: NodeOutputHandle[];
  errors: string[];
  usesExternalIO?: boolean;
}

export type UtilityNodeType = Exclude<WorkflowNodeType, "plugin">;
