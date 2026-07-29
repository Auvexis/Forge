import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { up } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { AgentRunRepository } from "./agent-run-repository.ts";

describe("AgentRunRepository", () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(":memory:");
    await up(db);
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
});
