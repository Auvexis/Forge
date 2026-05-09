import type { WorkflowNode } from "../../shared/models/workflow-types.ts";
import type { NodeHandler, NodeHandlerInput, NodeHandlerMetadata } from "./types.ts";

export function createNodeHandler<TNode extends WorkflowNode>(
  type: TNode["type"],
  execute: (input: NodeHandlerInput<TNode>) => Promise<any> | any,
  metadata: NodeHandlerMetadata,
): NodeHandler {
  return { type, execute: execute as NodeHandler["execute"], metadata };
}
