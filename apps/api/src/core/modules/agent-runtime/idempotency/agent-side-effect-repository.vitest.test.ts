import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createSideEffects } from "../../../database/migrations/workflows/010_agent_side_effects.ts";
import { AgentRunRepository } from "../persistence/agent-run-repository.ts";
import { AgentSideEffectRepository } from "./agent-side-effect-repository.ts";

describe("AgentSideEffectRepository", () => {
  let repository: AgentSideEffectRepository;
  const now = new Date("2026-01-01T00:00:00.000Z");

  beforeEach(async () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createRuns(db);
    await createSideEffects(db);
    new AgentRunRepository(db).create({
      id: "run_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      userMessage: "send",
    });
    repository = new AgentSideEffectRepository(db);
  });

  it("reserves once and replays a successful result", () => {
    expect(repository.reserve(reservation("owner_1", now))).toMatchObject({
      status: "acquired",
      attempt: 1,
    });
    expect(repository.reserve(reservation("owner_2", now))).toMatchObject({ status: "busy" });
    repository.succeed({
      profileId: "profile_1",
      idempotencyKey: "key_1",
      ownerToken: "owner_1",
      result: { messageId: "mail_1" },
      now,
    });
    expect(repository.reserve(reservation("owner_2", now))).toEqual({
      status: "replay",
      result: { messageId: "mail_1" },
    });
  });

  it("reclaims an expired reservation after a crash", () => {
    repository.reserve(reservation("dead_worker", now));
    const recovered = repository.reserve(
      reservation("new_worker", new Date("2026-01-01T00:01:00.000Z")),
    );
    expect(recovered).toMatchObject({
      status: "acquired",
      ownerToken: "new_worker",
      attempt: 2,
    });
  });
});

function reservation(ownerToken: string, now: Date) {
  return {
    idempotencyKey: "key_1",
    profileId: "profile_1",
    runId: "run_1",
    actionId: "email",
    toolName: "email_send",
    argumentsHash: "args_1",
    ownerToken,
    now,
    leaseMs: 30_000,
  };
}
