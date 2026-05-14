import { WorkflowRepository } from "../workflows/repository.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import { resolveEventTriggers } from "../workflows/workflow-triggers.ts";

export interface InternalEvent {
  name: string;
  payload: Record<string, any>;
  emittedBy?: string;
  timestamp: number;
}

export const InternalEventBus = {
  async emit(event: InternalEvent): Promise<{ triggered: string[] }> {
    const { WorkflowEngine } = await import("../workflows/executor.ts");

    const workflows: WorkflowItem[] = WorkflowRepository.getActiveWorkflows();
    const triggered: string[] = [];

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
          `[NOD8 | EVENTS]: Workflow ${workflow.metadata.id}/${triggerNodeId} triggered by "${event.name}" failed: ${err.message}`,
        ),
      );

      triggered.push(executionId);
    }

    if (triggered.length > 0) {
      console.log(
        `[NOD8 | EVENTS]: Event "${event.name}" triggered ${triggered.length} workflow(s): ${triggered.join(", ")}`,
      );
    }

    return { triggered };
  },
};
