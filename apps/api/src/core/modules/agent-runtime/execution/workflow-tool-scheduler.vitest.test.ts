import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createRequests } from "../../../database/migrations/workflows/017_agent_engine_requests.ts";
import { up as createResponses } from "../../../database/migrations/workflows/018_agent_engine_responses.ts";
import { up as createIdempotency } from "../../../database/migrations/workflows/020_agent_engine_idempotency.ts";
import { up as createCorrelation } from "../../../database/migrations/workflows/021_agent_engine_response_correlation.ts";
import { AgentEngineRequestRepository } from "../engine-protocol/agent-engine-request-repository.ts";
import { AgentEngineResponseRepository } from "../engine-protocol/agent-engine-response-repository.ts";
import type { AgentEngineToolRequest } from "../engine-protocol/agent-engine-request.ts";
import { WorkflowToolScheduler } from "./workflow-tool-scheduler.ts";

describe("WorkflowToolScheduler", () => {
  let db: Database.Database;
  let requests: AgentEngineRequestRepository;
  let responses: AgentEngineResponseRepository;

  beforeEach(async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createRuns(db);
    await createRequests(db);
    await createResponses(db);
    await createIdempotency(db);
    await createCorrelation(db);
    db.prepare(`
      INSERT INTO agent_runs (
        id, profile_id, workflow_id, execution_id, node_id, user_message,
        state, version, created_at, updated_at
      ) VALUES ('run_1', 'profile_1', 'workflow_1', 'execution_1', 'agent_1',
        'hello', 'running', 1, '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z')
    `).run();
    requests = new AgentEngineRequestRepository(db);
    responses = new AgentEngineResponseRepository(db);
  });

  it("persists a successful result before completing its request", async () => {
    const execute = vi.fn(async () => ({ files: [] }));
    const scheduler = createScheduler(execute);

    const response = await scheduler.dispatch(request());

    expect(response).toMatchObject({ status: "succeeded", output: { files: [] } });
    expect(requests.getById("request_1")?.status).toBe("completed");
    expect(responses.getByRequestId("request_1")).toEqual(response);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("returns the persisted response when the same request is dispatched again", async () => {
    const execute = vi.fn(async () => ({ ok: true }));
    const scheduler = createScheduler(execute);

    const first = await scheduler.dispatch(request());
    const second = await scheduler.dispatch({ ...request(), id: "request_2" });

    expect(second).toEqual(first);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("persists failures as resumable engine responses", async () => {
    const scheduler = createScheduler(async () => {
      throw new Error("Drive unavailable");
    });

    const response = await scheduler.dispatch(request());

    expect(response).toMatchObject({
      status: "failed",
      error: { code: "AGENT_TOOL_EXECUTION_FAILED", message: "Drive unavailable" },
    });
    expect(requests.getById("request_1")?.status).toBe("failed");
  });

  it("persists cancellation without invoking the tool", async () => {
    const execute = vi.fn(async () => ({ ok: true }));
    const scheduler = createScheduler(execute);
    const controller = new AbortController();
    controller.abort(new Error("User cancelled"));

    const response = await scheduler.dispatch(request(), controller.signal);

    expect(response).toMatchObject({ status: "cancelled", reason: "User cancelled" });
    expect(requests.getById("request_1")?.status).toBe("cancelled");
    expect(execute).not.toHaveBeenCalled();
  });

  function createScheduler(execute: (target: any, arguments_: any) => Promise<unknown>) {
    return new WorkflowToolScheduler(
      requests,
      responses,
      { resolve: (toolName) => ({ nodeId: "tool_1", toolName }) },
      { execute },
    );
  }
});

function request(): AgentEngineToolRequest {
  return {
    kind: "tool",
    id: "request_1",
    idempotencyKey: "run_1:call_1",
    runId: "run_1",
    iteration: 1,
    toolCallId: "call_1",
    actionId: "action_1",
    toolName: "drive_list",
    arguments: { query: "backend" },
    status: "queued",
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
  };
}
