import { EventEmitter } from "events";

// ──────────── Workflow Execution Event Types ────────────

export interface WorkflowEvent {
  executionId: string;
  workflowId: string;
  type:
    | "trigger:data"
    | "node:start"
    | "node:retry"
    | "node:success"
    | "node:failed"
    | "workflow:start"
    | "workflow:success"
    | "workflow:failed"
    | "workflow:cancelled"
    | "temporary-form:created";
  nodeId?: string;
  timestamp: number;
  /** Sanitized output data for node:success events */
  data?: any;
  /** Error message for node:failed events */
  error?: string;
}

// ──────────── Event Bus ────────────

class WorkflowEventBus extends EventEmitter {
  constructor() {
    super();
    // Raise the default listener limit to support many concurrent executions
    this.setMaxListeners(200);
  }

  emitWorkflowEvent(event: WorkflowEvent): void {
    this.emit("workflow-event", event);
  }

  /**
   * Subscribe to all events for a specific execution.
   * Returns an unsubscribe function — call it when the SSE connection closes.
   */
  onExecution(
    executionId: string,
    handler: (event: WorkflowEvent) => void,
  ): () => void {
    const listener = (event: WorkflowEvent) => {
      if (event.executionId === executionId) {
        handler(event);
      }
    };
    this.on("workflow-event", listener);
    return () => this.off("workflow-event", listener);
  }
}

export const workflowEventBus = new WorkflowEventBus();
