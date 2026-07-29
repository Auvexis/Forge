import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { up } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { AgentRunRepository } from "./agent-run-repository.ts";
import { AgentActionRepository } from "./agent-action-repository.ts";

describe("AgentActionRepository", () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = new Database(":memory:");
    await up(db);
    new AgentRunRepository(db).create({
      id: "run_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      userMessage: "send the file",
    });
  });

  it("persists actions and lists them in execution order", () => {
    const repository = new AgentActionRepository(db);
    repository.create({
      id: "action_2",
      runId: "run_1",
      position: 2,
      toolName: "email_send",
      objective: "Send the file",
      dependsOn: ["action_1"],
      arguments: { recipient: "person@example.com" },
    });
    repository.create({
      id: "action_1",
      runId: "run_1",
      position: 1,
      toolName: "drive_download",
      objective: "Download the file",
    });

    expect(repository.listByRun("profile_1", "run_1").map((action) => action.id))
      .toEqual(["action_1", "action_2"]);
    expect(repository.getById("run_1", "action_2")).toMatchObject({
      dependsOn: ["action_1"],
      arguments: { recipient: "person@example.com" },
      version: 1,
    });
    expect(repository.listByRun("profile_2", "run_1")).toEqual([]);
  });
});
