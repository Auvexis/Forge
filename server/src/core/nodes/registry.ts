import type { WorkflowNode, WorkflowNodeType } from "../../shared/models/workflow-types.ts";
import type { NodeHandler, UtilityNodeType } from "./types.ts";

export function createNodeHandler<TNode extends WorkflowNode>(
  type: TNode["type"],
  execute: NodeHandler<TNode>["execute"],
): NodeHandler<TNode> {
  return { type, execute };
}

export class NodeHandlerRegistry {
  private readonly handlers = new Map<WorkflowNodeType, NodeHandler>();

  constructor(handlers: NodeHandler[] = []) {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  register(handler: NodeHandler): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Duplicate node handler registered for type "${handler.type}"`);
    }
    this.handlers.set(handler.type, handler);
  }

  has(type: WorkflowNodeType): boolean {
    return this.handlers.has(type);
  }

  get(type: WorkflowNodeType): NodeHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No node handler registered for type "${type}"`);
    }
    return handler;
  }
}

const utilityNodeTypes: UtilityNodeType[] = [
  "code",
  "if",
  "loop",
  "subworkflow",
  "trigger",
  "http",
  "event",
  "event-listener",
  "set",
  "switch",
  "merge",
  "split-in-batches",
  "respond-webhook",
];

export function createUtilityNodeRegistry(handlers: NodeHandler[] = []): NodeHandlerRegistry {
  const registry = new NodeHandlerRegistry();
  for (const handler of handlers) {
    if (!utilityNodeTypes.includes(handler.type as UtilityNodeType)) {
      throw new Error(`Node type "${handler.type}" is not a utility node handler`);
    }
    registry.register(handler);
  }
  return registry;
}
