import type { WorkflowNodeType } from "../../shared/models/workflow-types.ts";
import { fabricCoreUtilityNodes } from "../utility-nodes/fabric-core/index.ts";
export { createNodeHandler } from "./handler.ts";
import type { NodeHandler, UtilityNodeType } from "./types.ts";

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

  list(): NodeHandler[] {
    return [...this.handlers.values()];
  }
}

const utilityNodeTypes = fabricCoreUtilityNodes.map((node) => node.manifest.type);

export function createUtilityNodeRegistry(
  handlers?: NodeHandler[],
): NodeHandlerRegistry {
  const registry = new NodeHandlerRegistry();
  const activeHandlers = handlers ?? fabricCoreUtilityNodes.map((node) => node.handler);
  for (const handler of activeHandlers) {
    if (!utilityNodeTypes.includes(handler.type as UtilityNodeType)) {
      throw new Error(`Node type "${handler.type}" is not a utility node handler`);
    }
    registry.register(handler);
  }
  return registry;
}
