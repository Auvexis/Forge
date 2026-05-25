import type { WorkflowNodeType } from "../../shared/models/workflow-types.ts";
import { aiAgentNodeHandler } from "./handlers/ai-agent.ts";
import { aiMemoryNodeHandler } from "./handlers/ai-memory.ts";
import { aiModelNodeHandler } from "./handlers/ai-model.ts";
import { aiToolNodeHandler } from "./handlers/ai-tool.ts";
import { codeNodeHandler } from "./handlers/code.ts";
import { eventListenerNodeHandler } from "./handlers/event-listener.ts";
import { eventNodeHandler } from "./handlers/event.ts";
import { httpNodeHandler } from "./handlers/http.ts";
import { ifNodeHandler } from "./handlers/if.ts";
import { loopNodeHandler } from "./handlers/loop.ts";
import { mergeNodeHandler } from "./handlers/merge.ts";
import { respondWebhookNodeHandler } from "./handlers/respond-webhook.ts";
import { setNodeHandler } from "./handlers/set.ts";
import { splitInBatchesNodeHandler } from "./handlers/split-in-batches.ts";
import { subWorkflowNodeHandler } from "./handlers/subworkflow.ts";
import { switchNodeHandler } from "./handlers/switch.ts";
import { triggerNodeHandler } from "./handlers/trigger.ts";
import { waitFormNodeHandler } from "./handlers/wait-form.ts";
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
  "wait-form",
  "ai-agent",
  "ai-model",
  "ai-memory",
  "ai-tool",
];

const defaultUtilityHandlers: NodeHandler[] = [
  codeNodeHandler,
  ifNodeHandler,
  loopNodeHandler,
  subWorkflowNodeHandler,
  triggerNodeHandler,
  httpNodeHandler,
  eventNodeHandler,
  eventListenerNodeHandler,
  setNodeHandler,
  switchNodeHandler,
  mergeNodeHandler,
  splitInBatchesNodeHandler,
  respondWebhookNodeHandler,
  waitFormNodeHandler,
  aiAgentNodeHandler,
  aiModelNodeHandler,
  aiMemoryNodeHandler,
  aiToolNodeHandler,
];

export function createUtilityNodeRegistry(
  handlers: NodeHandler[] = defaultUtilityHandlers,
): NodeHandlerRegistry {
  const registry = new NodeHandlerRegistry();
  for (const handler of handlers) {
    if (!utilityNodeTypes.includes(handler.type as UtilityNodeType)) {
      throw new Error(`Node type "${handler.type}" is not a utility node handler`);
    }
    registry.register(handler);
  }
  return registry;
}
