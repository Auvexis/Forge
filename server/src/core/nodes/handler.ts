import type { WorkflowNode } from "../../shared/models/workflow-types.ts";
import type { NodeHandler, NodeHandlerInput } from "./types.ts";

export function createNodeHandler<TNode extends WorkflowNode>(
  type: TNode["type"],
  execute: (input: NodeHandlerInput<TNode>) => Promise<any> | any,
): NodeHandler {
  return { type, execute: execute as NodeHandler["execute"] };
}
