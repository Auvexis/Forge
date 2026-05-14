import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryExecutionQueue } from "./execution-queue.ts";
import type { WorkflowJob } from "./types.ts";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function job(id: string, sessionId = "session-1"): WorkflowJob {
  return {
    id,
    sessionId,
    workflowId: "wf-1",
    triggerNodeId: "trigger",
    executionId: `exec-${id}`,
    status: "queued",
    source: "manual",
    payload: {},
    queuedAt: Date.now(),
  };
}

describe("InMemoryExecutionQueue", () => {
  it("runs jobs in queue order with per-session concurrency", async () => {
    const started: string[] = [];
    const queue = new InMemoryExecutionQueue({
      maxConcurrentPerSession: 1,
      maxConcurrentGlobal: 4,
      runJob: async (queuedJob) => {
        started.push(queuedJob.id);
      },
    });

    queue.enqueue(job("a"));
    queue.enqueue(job("b"));
    await queue.onIdle();

    assert.deepEqual(started, ["a", "b"]);
  });

  it("enforces global concurrency across sessions", async () => {
    let running = 0;
    let observedMax = 0;
    const queue = new InMemoryExecutionQueue({
      maxConcurrentPerSession: 2,
      maxConcurrentGlobal: 2,
      runJob: async () => {
        running++;
        observedMax = Math.max(observedMax, running);
        await delay(20);
        running--;
      },
    });

    queue.enqueue(job("a", "session-a"));
    queue.enqueue(job("b", "session-b"));
    queue.enqueue(job("c", "session-c"));
    await queue.onIdle();

    assert.equal(observedMax, 2);
  });

  it("rejects new jobs after a session is stopped", () => {
    const queue = new InMemoryExecutionQueue({
      maxConcurrentPerSession: 1,
      maxConcurrentGlobal: 1,
      runJob: async () => {},
    });

    queue.stopSession("session-1");

    assert.throws(
      () => queue.enqueue(job("a")),
      /Cannot enqueue job for stopped session session-1/,
    );
  });

  it("cancels pending jobs without interrupting a running job", async () => {
    const completed: string[] = [];
    const events: string[] = [];
    const queue = new InMemoryExecutionQueue({
      maxConcurrentPerSession: 1,
      maxConcurrentGlobal: 1,
      runJob: async (queuedJob) => {
        await delay(20);
        completed.push(queuedJob.id);
      },
      onEvent: (event) => events.push(`${event.type}:${event.jobId}`),
    });

    queue.enqueue(job("running"));
    queue.enqueue(job("pending"));
    queue.cancelPending("session-1");
    await queue.onIdle();

    assert.deepEqual(completed, ["running"]);
    assert.ok(events.includes("job:cancelled:pending"));
  });
});
