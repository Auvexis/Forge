import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SessionEventBus } from "./session-event-bus.ts";
import type { WorkflowEvent } from "../event-bus.ts";
import type { WorkflowJob } from "./types.ts";

function job(): WorkflowJob {
  return {
    id: "job-1",
    sessionId: "session-1",
    workflowId: "wf-1",
    triggerNodeId: "trigger-a",
    executionId: "exec-1",
    status: "running",
    source: "manual",
    payload: {},
    queuedAt: Date.now(),
  };
}

describe("SessionEventBus", () => {
  it("emits events only to listeners for the matching session", () => {
    const bus = new SessionEventBus();
    const received: string[] = [];

    bus.onSession("session-1", (event) => received.push(event.type));
    bus.onSession("other-session", (event) => received.push(`other:${event.type}`));

    bus.emitSessionEvent({
      type: "job:queued",
      sessionId: "session-1",
      workflowId: "wf-1",
      timestamp: Date.now(),
      jobId: "job-1",
    });

    assert.deepEqual(received, ["job:queued"]);
  });

  it("maps workflow node events to session events with job metadata", () => {
    const bus = new SessionEventBus();
    const received: unknown[] = [];
    const workflowEvent: WorkflowEvent = {
      type: "node:success",
      executionId: "exec-1",
      workflowId: "wf-1",
      nodeId: "node-1",
      timestamp: Date.now(),
      data: { ok: true },
    };

    bus.onSession("session-1", (event) => received.push(event));
    bus.emitWorkflowEvent(job(), workflowEvent);

    assert.deepEqual(received, [{
      type: "node:success",
      sessionId: "session-1",
      workflowId: "wf-1",
      executionId: "exec-1",
      triggerNodeId: "trigger-a",
      nodeId: "node-1",
      jobId: "job-1",
      source: "manual",
      timestamp: workflowEvent.timestamp,
      data: { ok: true },
      error: undefined,
    }]);
  });
});
