import type {
  WorkflowEdge,
  WorkflowItem,
  WorkflowNode,
  WorkflowNodeType,
} from "../../shared/models/workflow-types.ts";

export interface WorkflowExecutionContext {
  _workflowId?: string;
  _executionId?: string;
  _webhookCorrelationId?: string;
  _event_payloads?: Record<string, any>;
  trigger: any;
  steps: Record<string, any>;
  variables: Record<string, any>;
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
  executeNode: (input: Omit<NodeHandlerInput, "services">) => Promise<any>;
  executeWorkflow: (
    workflow: WorkflowItem,
    triggerPayload: any,
    executionId?: string,
  ) => Promise<any>;
  emitNodeStart: (nodeId: string) => void;
  emitNodeSuccess: (nodeId: string, result: any, node?: WorkflowNode) => void;
  emitNodeFailure: (nodeId: string, error: Error) => void;
}

export interface NodeHandler<TNode extends WorkflowNode = WorkflowNode> {
  type: TNode["type"];
  execute: (input: NodeHandlerInput<TNode>) => Promise<any> | any;
}

export type UtilityNodeType = Exclude<WorkflowNodeType, "plugin">;
