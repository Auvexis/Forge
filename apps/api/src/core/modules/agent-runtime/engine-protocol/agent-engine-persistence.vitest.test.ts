import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createRequests } from "../../../database/migrations/workflows/017_agent_engine_requests.ts";
import { up as createResponses } from "../../../database/migrations/workflows/018_agent_engine_responses.ts";
import { up as createContinuations } from "../../../database/migrations/workflows/019_agent_continuations.ts";
import { up as createIdempotency } from "../../../database/migrations/workflows/020_agent_engine_idempotency.ts";
import { up as createCorrelation } from "../../../database/migrations/workflows/021_agent_engine_response_correlation.ts";
import { AgentContinuationRepository } from "./agent-continuation-repository.ts";
import { AgentEngineRequestRepository } from "./agent-engine-request-repository.ts";
import { AgentEngineResponseRepository } from "./agent-engine-response-repository.ts";

describe("agent engine persistence", () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createRuns(db);
    await createRequests(db);
    await createResponses(db);
    await createContinuations(db);
    await createIdempotency(db);
    await createCorrelation(db);
    db.prepare(`
      INSERT INTO agent_runs (
        id, profile_id, workflow_id, execution_id, node_id, user_message,
        state, version, created_at, updated_at
      ) VALUES ('run_1', 'profile_1', 'workflow_1', 'execution_1', 'agent_1',
        'hello', 'running', 1, '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z')
    `).run();
  });

  it("persists idempotent requests and correlated responses", () => {
    const requests = new AgentEngineRequestRepository(db);
    const request = {
      kind: "tool" as const,
      id: "request_1",
      idempotencyKey: "run_1:call_1",
      runId: "run_1",
      iteration: 1,
      toolCallId: "call_1",
      actionId: "action_1",
      toolName: "drive_list",
      arguments: { query: "backend" },
      status: "queued" as const,
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };

    expect(requests.createOrGet(request)).toEqual(request);
    expect(requests.createOrGet({ ...request, id: "request_2" }).id).toBe("request_1");
    expect(requests.updateStatus("request_1", "leased").status).toBe("leased");

    const responses = new AgentEngineResponseRepository(db);
    responses.create({
      id: "response_1",
      requestId: "request_1",
      runId: "run_1",
      toolCallId: "call_1",
      status: "succeeded",
      output: [],
      createdAt: "2026-07-30T00:00:01.000Z",
    });
    expect(responses.getByRequestId("request_1")).toMatchObject({
      toolCallId: "call_1",
      status: "succeeded",
      output: [],
    });
  });

  it("rejects stale continuation revisions", () => {
    const continuations = new AgentContinuationRepository(db);
    const metadata = {
      runId: "run_1",
      iteration: 1,
      previousRequestIds: [],
      completedToolCallIds: [],
      contextRevision: 1,
    };
    const created = continuations.create(metadata);
    expect(continuations.update({
      metadata: { ...metadata, iteration: 2 },
      expectedRevision: created.revision,
    }).revision).toBe(2);
    expect(() => continuations.update({
      metadata: { ...metadata, iteration: 3 },
      expectedRevision: created.revision,
    })).toThrow(/Concurrent agent continuation/);
  });
});
