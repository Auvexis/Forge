import Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createInteractions } from "../../../database/migrations/workflows/008_agent_pending_interactions.ts";
import { up as createRequests } from "../../../database/migrations/workflows/017_agent_engine_requests.ts";
import { up as createResponses } from "../../../database/migrations/workflows/018_agent_engine_responses.ts";
import { up as createIdempotency } from "../../../database/migrations/workflows/020_agent_engine_idempotency.ts";
import { up as createCorrelation } from "../../../database/migrations/workflows/021_agent_engine_response_correlation.ts";
import { AgentRuntimeError } from "../agent-errors.ts";
import { AgentEngineRequestRepository } from "../engine-protocol/agent-engine-request-repository.ts";
import { AgentEngineResponseRepository } from "../engine-protocol/agent-engine-response-repository.ts";
import type { AgentEngineToolRequest } from "../engine-protocol/agent-engine-request.ts";
import { WorkflowToolScheduler } from "../execution/workflow-tool-scheduler.ts";
import { AgentPendingInteractionRepository } from "../persistence/agent-pending-interaction-repository.ts";
import { AgentEngineRecoveryService } from "./agent-engine-recovery-service.ts";

describe("agent engine restart matrix", () => {
  let db: Database.Database;
  let requests: AgentEngineRequestRepository;
  let responses: AgentEngineResponseRepository;
  let interactions: AgentPendingInteractionRepository;

  beforeEach(async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createRuns(db);
    await createInteractions(db);
    await createRequests(db);
    await createResponses(db);
    await createIdempotency(db);
    await createCorrelation(db);
    db.prepare(`
      INSERT INTO agent_runs (
        id, profile_id, workflow_id, execution_id, node_id, session_id,
        user_message, state, version, created_at, updated_at
      ) VALUES ('run_1', 'profile_1', 'workflow_1', 'execution_1', 'agent_1',
        'session_1', 'hello', 'running', 1, ?, ?)
    `).run(now(-60_000), now(-60_000));
    requests = new AgentEngineRequestRepository(db);
    responses = new AgentEngineResponseRepository(db);
    interactions = new AgentPendingInteractionRepository(db);
  });

  it("recovers queued requests and waiting interactions after restart", async () => {
    requests.create(request());
    interactions.create({
      id: "interaction_1",
      runId: "run_1",
      kind: "clarification",
      question: "Which file?",
      context: {},
    });
    const execute = vi.fn(async () => ({ ok: true }));
    const recovery = new AgentEngineRecoveryService(
      requests,
      interactions,
      () => scheduler(execute),
    );

    const report = await recovery.recover();

    expect(report.recoveredRequestIds).toEqual(["request_1"]);
    expect(report.waitingInteractions).toEqual([
      expect.objectContaining({ id: "interaction_1", status: "pending" }),
    ]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(requests.getById("request_1")?.status).toBe("completed");
  });

  it("reclaims an expired executing lease after restart", async () => {
    requests.create({
      ...request(),
      status: "executing",
      attempt: 1,
      leaseOwner: "dead_worker",
      leaseExpiresAt: now(-1_000),
    });
    const execute = vi.fn(async () => ({ recovered: true }));

    const report = await new AgentEngineRecoveryService(
      requests,
      interactions,
      () => scheduler(execute),
    ).recover();

    expect(report.recoveredRequestIds).toEqual(["request_1"]);
    expect(execute).toHaveBeenCalledOnce();
  });

  it("retries temporary failures and dead-letters exhausted requests", async () => {
    const temporary = new AgentRuntimeError(
      "temporary",
      "AGENT_TEMPORARY",
      "Temporary",
      503,
    );
    const eventually = vi.fn()
      .mockRejectedValueOnce(temporary)
      .mockResolvedValueOnce({ ok: true });
    const successful = await scheduler(eventually).dispatch(request());
    expect(successful.status).toBe("succeeded");
    expect(eventually).toHaveBeenCalledTimes(2);

    requests.create({ ...request(), id: "request_dead", idempotencyKey: "dead", toolCallId: "dead" });
    const alwaysFails = vi.fn(async () => {
      throw temporary;
    });
    const failed = await scheduler(alwaysFails).dispatch({
      ...request(),
      id: "request_dead",
      idempotencyKey: "dead",
      toolCallId: "dead",
    });
    expect(failed.status).toBe("failed");
    expect(requests.getById("request_dead")?.status).toBe("dead-letter");
    expect(alwaysFails).toHaveBeenCalledTimes(3);
  });

  function scheduler(execute: () => Promise<unknown>) {
    return new WorkflowToolScheduler(
      requests,
      responses,
      { resolve: (toolName) => ({ nodeId: "tool_1", toolName }) },
      { execute },
      undefined,
      { retryBaseMs: 0, leaseMs: 10_000 },
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
    createdAt: now(-30_000),
    updatedAt: now(-30_000),
  };
}

function now(offset = 0): string {
  return new Date(Date.now() + offset).toISOString();
}
