import { WorkflowRepository } from "../workflows/repository.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import { resolveEventTriggers } from "../workflows/workflow-triggers.ts";

export interface InternalEvent {
  name: string;
  payload: Record<string, any>;
  emittedBy?: string;
  timestamp: number;
}

type InternalEventHandler = (event: InternalEvent) => void | Promise<void>;
const listeners = new Map<string, Set<InternalEventHandler>>();

export const InternalEventBus = {
  on(eventName: string, handler: InternalEventHandler): () => void {
    const handlers = listeners.get(eventName) ?? new Set<InternalEventHandler>();
    handlers.add(handler);
    listeners.set(eventName, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) listeners.delete(eventName);
    };
  },

  async emit(event: InternalEvent): Promise<{ triggered: string[] }> {
    const { WorkflowEngine } = await import("../workflows/executor.ts");

    const workflows: WorkflowItem[] = WorkflowRepository.getActiveWorkflows();
    const triggered: string[] = [];

    for (const handler of listeners.get(event.name) ?? []) {
      await handler(event);
    }

    for (const resolved of resolveEventTriggers(workflows, event.name)) {
      const { workflow, triggerNodeId } = resolved;
      const executionId = `exec_event_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      const triggerPayload = {
        event: event.name,
        payload: event.payload,
        emittedBy: event.emittedBy ?? "unknown",
        timestamp: event.timestamp,
        triggerNodeId,
      };

      WorkflowEngine.executeWorkflowFromTrigger(
        workflow,
        triggerNodeId,
        triggerPayload,
        executionId,
      ).catch((err: Error) =>
        console.error(
          `[FABRIC | EVENTS]: Workflow ${workflow.metadata.id}/${triggerNodeId} triggered by "${event.name}" failed: ${err.message}`,
        ),
      );

      triggered.push(executionId);
    }

    if (triggered.length > 0) {
      console.log(
        `[FABRIC | EVENTS]: Event "${event.name}" triggered ${triggered.length} workflow(s): ${triggered.join(", ")}`,
      );
    }

    return { triggered };
  },
};
