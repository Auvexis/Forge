import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { WorkflowJobRunner } from "./workflow-job-runner.ts";
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
    nodes: {
      trigger_a: {
        type: "trigger",
        name: "Manual A",
        trigger: { type: "manual" },
      },
    },
    edges: [],
    variables: [],
  };
}

describe("WorkflowJobRunner", () => {
  it("creates jobs with generated job and execution ids", () => {
    const runner = new WorkflowJobRunner({
      executeWorkflowFromTrigger: async () => ({}),
      cancelExecution: () => {},
      createId: (prefix) => `${prefix}_fixed`,
    });

    const created = runner.createJob({
      sessionId: "session-1",
      workflowId: "wf-1",
      triggerNodeId: "trigger_a",
      source: "manual",
      payload: { hello: "world" },
    });

    assert.equal(created.id, "job_fixed");
    assert.equal(created.executionId, "exec_fixed");
    assert.equal(created.status, "queued");
    assert.equal(created.triggerNodeId, "trigger_a");
    assert.deepEqual(created.payload, { hello: "world" });
  });

  it("runs a job through executeWorkflowFromTrigger with trigger payload and execution id", async () => {
    const calls: unknown[] = [];
    const runner = new WorkflowJobRunner({
      executeWorkflowFromTrigger: async (...args) => {
        calls.push(args);
        return { status: "SUCCESS" };
      },
      cancelExecution: () => {},
      createId: (prefix) => `${prefix}_1`,
    });
    const wf = workflow();
    const created = runner.createJob({
      sessionId: "session-1",
      workflowId: wf.metadata.id,
      triggerNodeId: "trigger_a",
      source: "webhook",
      payload: { body: { ok: true } },
    });

    await runner.run(created, wf);

    assert.deepEqual(calls, [[wf, "trigger_a", { body: { ok: true } }, "exec_1"]]);
  });

  it("propagates execution failures", async () => {
    const runner = new WorkflowJobRunner({
      executeWorkflowFromTrigger: async () => {
        throw new Error("boom");
      },
      cancelExecution: () => {},
      createId: (prefix) => `${prefix}_1`,
    });
    const created = runner.createJob({
      sessionId: "session-1",
      workflowId: "wf-1",
      triggerNodeId: "trigger_a",
      source: "manual",
      payload: {},
    });

    await assert.rejects(() => runner.run(created, workflow()), /boom/);
  });

  it("requests cancellation for the job execution id", () => {
    const cancelled: string[] = [];
    const runner = new WorkflowJobRunner({
      executeWorkflowFromTrigger: async () => ({}),
      cancelExecution: (executionId) => cancelled.push(executionId),
      createId: (prefix) => `${prefix}_1`,
    });
    const created = runner.createJob({
      sessionId: "session-1",
      workflowId: "wf-1",
      triggerNodeId: "trigger_a",
      source: "manual",
      payload: {},
    });

    runner.cancel(created);

    assert.deepEqual(cancelled, ["exec_1"]);
  });
});
