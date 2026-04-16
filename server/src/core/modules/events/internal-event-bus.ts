import { WorkflowRepository } from "../workflows/repository.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

// ──────────── Internal Event Type ────────────

export interface InternalEvent {
  name: string;
  payload: Record<string, any>;
  emittedBy?: string; // workflowId or "api"
  timestamp: number;
}

// ──────────── Internal Event Bus ────────────

/**
 * Pub/Sub bus for internal nod8 events.
 *
 * A workflow with trigger.type === "event" and trigger.eventName === X
 * will be executed whenever InternalEventBus.emit({ name: X, ... }) is called.
 *
 * This enables inter-workflow communication without tight coupling.
 * All triggered workflows run independently (fire-and-forget).
 */
export const InternalEventBus = {
  /**
   * Emit a named event. All active, non-draft workflows listening on
   * this event name will be triggered asynchronously.
   *
   * Returns the list of workflow IDs that were triggered.
   */
  async emit(event: InternalEvent): Promise<{ triggered: string[] }> {
    // Lazily import WorkflowEngine to avoid circular dependency at module load time
    const { WorkflowEngine } = await import("../workflows/executor.ts");

    const workflows: WorkflowItem[] = WorkflowRepository.getActiveWorkflows();
    const triggered: string[] = [];

    for (const workflow of workflows) {
      if (
        workflow.trigger.type === "event" &&
        workflow.trigger.eventName === event.name
      ) {
        const executionId = `exec_event_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        const triggerPayload = {
          event: event.name,
          payload: event.payload,
          emittedBy: event.emittedBy ?? "unknown",
          timestamp: event.timestamp,
        };

        // Fire-and-forget — each triggered workflow runs independently
        WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId).catch(
          (err: Error) =>
            console.error(
              `[NOD8 | EVENTS]: Workflow ${workflow.metadata.id} triggered by "${event.name}" failed: ${err.message}`,
            ),
        );

        triggered.push(workflow.metadata.id);
      }
    }

    if (triggered.length > 0) {
      console.log(
        `[NOD8 | EVENTS]: Event "${event.name}" triggered ${triggered.length} workflow(s): ${triggered.join(", ")}`,
      );
    }

    return { triggered };
  },
};
