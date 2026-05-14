import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DevWorkflowSessionManager } from "./dev-workflow-session-manager.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";

function workflow(): WorkflowItem {
  return {
    metadata: {
      id: "wf-1",
      name: "Workflow",
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: "2026-05-14T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {},
    edges: [],
    variables: [],
  };
}

describe("DevWorkflowSessionManager", () => {
  it("creates and stores a running dev session", () => {
    const manager = new DevWorkflowSessionManager({
      createId: () => "session-1",
    });

    const session = manager.createSession(workflow());

    assert.equal(session.id, "session-1");
    assert.equal(session.workflowId, "wf-1");
    assert.equal(session.status, "running");
    assert.equal(manager.getSession("session-1")?.id, "session-1");
  });

  it("connects created sessions to the queue", async () => {
    const ran: string[] = [];
    const manager = new DevWorkflowSessionManager({
      createId: (prefix) => `${prefix}_1`,
      runWorkflowJob: async (job) => {
        ran.push(job.id);
      },
    });
    const session = manager.createSession(workflow());

    manager.enqueueJob(session.id, {
      triggerNodeId: "trigger",
      source: "manual",
      payload: {},
    });
    await manager.onIdle();

    assert.deepEqual(ran, ["job_1"]);
  });

  it("stops sessions with idempotent trigger teardown and removes the session", async () => {
    let teardownCalls = 0;
    const manager = new DevWorkflowSessionManager({
      createId: () => "session-1",
    });
    const session = manager.createSession(workflow());
    session.triggerRuntimes.push({
      triggerNodeId: "trigger",
      type: "manual",
      teardown: () => {
        teardownCalls++;
      },
    });

    await manager.stopSession("session-1", "manual stop");
    await manager.stopSession("session-1", "duplicate stop");

    assert.equal(teardownCalls, 1);
    assert.equal(manager.getSession("session-1"), null);
  });
});
