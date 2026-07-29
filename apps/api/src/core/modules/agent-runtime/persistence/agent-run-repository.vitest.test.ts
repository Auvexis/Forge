import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { up } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as addRunLeases } from "../../../database/migrations/workflows/011_agent_run_leases.ts";
import { AgentRunRepository } from "./agent-run-repository.ts";

describe("AgentRunRepository", () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(":memory:");
    await up(db);
    await addRunLeases(db);
  });

  it("creates and retrieves profile-scoped runs", () => {
    const repository = new AgentRunRepository(db);
    const created = repository.create({
      id: "run_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      sessionId: "chat_1",
      userMessage: "hello",
    });

    expect(created.state).toBe("routing");
    expect(created.version).toBe(1);
    expect(repository.getById("profile_2", "run_1")).toBeNull();
    expect(repository.findLatestSessionRun({
      profileId: "profile_1",
      workflowId: "workflow_1",
      nodeId: "agent_1",
      sessionId: "chat_1",
    })?.id).toBe("run_1");
  });

  it("rejects stale state transitions", () => {
    const repository = new AgentRunRepository(db);
    const run = repository.create({
      id: "run_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      userMessage: "hello",
    });

    const running = repository.updateState({
      profileId: "profile_1",
      id: run.id,
      expectedVersion: run.version,
      state: "running",
    });
    expect(running.version).toBe(2);
    expect(() => repository.updateState({
      profileId: "profile_1",
      id: run.id,
      expectedVersion: run.version,
      state: "failed",
    })).toThrow(/Concurrent agent run update rejected/);
  });

  it("keeps a run leased to one worker until release or expiry", () => {
    const repository = new AgentRunRepository(db);
    repository.create({
      id: "run_lease",
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      userMessage: "hello",
    });
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(repository.acquireLease({
      profileId: "profile_1",
      id: "run_lease",
      owner: "worker_1",
      now,
      leaseMs: 30_000,
    })).toBe(true);
    expect(repository.acquireLease({
      profileId: "profile_1",
      id: "run_lease",
      owner: "worker_2",
      now,
      leaseMs: 30_000,
    })).toBe(false);
    expect(repository.heartbeatLease({
      profileId: "profile_1",
      id: "run_lease",
      owner: "worker_1",
      now: new Date("2026-01-01T00:00:10.000Z"),
      leaseMs: 30_000,
    })).toBe(true);
    expect(repository.releaseLease("profile_1", "run_lease", "worker_1")).toBe(true);
    expect(repository.acquireLease({
      profileId: "profile_1",
      id: "run_lease",
      owner: "worker_2",
      now,
      leaseMs: 30_000,
    })).toBe(true);
  });
});
