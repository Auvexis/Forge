import { EventEmitter } from "events";
import type { WorkflowEvent } from "../event-bus.ts";
import type { SessionEvent, WorkflowJob } from "./types.ts";

const workflowToSessionEvent: Partial<Record<WorkflowEvent["type"], SessionEvent["type"]>> = {
  "node:start": "node:start",
  "node:success": "node:success",
  "node:failed": "node:failed",
  "agent:start": "agent:start",
  "agent:model-start": "agent:model-start",
  "agent:model-end": "agent:model-end",
  "agent:output-delta": "agent:output-delta",
  "agent:tool-start": "agent:tool-start",
  "agent:tool-end": "agent:tool-end",
  "agent:memory-read": "agent:memory-read",
  "agent:memory-write": "agent:memory-write",
  "agent:approval-created": "agent:approval-created",
  "agent:approval-resumed": "agent:approval-resumed",
  "agent:error": "agent:error",
  "agent:end": "agent:end",
};

export class SessionEventBus extends EventEmitter {
  private readonly replayLimit: number;
  private readonly eventsBySession = new Map<string, SessionEvent[]>();

  constructor(options: { replayLimit?: number } = {}) {
    super();
    this.setMaxListeners(300);
    this.replayLimit = options.replayLimit ?? 200;
  }

  emitSessionEvent(event: SessionEvent): boolean {
    const events = this.eventsBySession.get(event.sessionId) ?? [];
    events.push(event);
    if (events.length > this.replayLimit) {
      events.splice(0, events.length - this.replayLimit);
    }
    this.eventsBySession.set(event.sessionId, events);
    return super.emit("session-event", event);
  }

  onSession(sessionId: string, handler: (event: SessionEvent) => void): () => void {
    for (const event of this.eventsBySession.get(sessionId) ?? []) {
      handler(event);
    }
    const listener = (event: SessionEvent) => {
      if (event.sessionId === sessionId) handler(event);
    };
    this.on("session-event", listener);
    return () => this.off("session-event", listener);
  }

  emitWorkflowEvent(job: WorkflowJob, event: WorkflowEvent): void {
    const mappedType = workflowToSessionEvent[event.type];
    if (!mappedType) return;

    this.emitSessionEvent({
      type: mappedType,
      sessionId: job.sessionId,
      workflowId: job.workflowId,
      executionId: job.executionId,
      triggerNodeId: job.triggerNodeId,
      nodeId: event.nodeId,
      jobId: job.id,
      source: job.source,
      timestamp: event.timestamp,
      data: event.data,
      error: event.error,
    });
  }
}

export const devSessionEventBus = new SessionEventBus();
