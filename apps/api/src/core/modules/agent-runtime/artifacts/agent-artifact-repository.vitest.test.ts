import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createArtifacts } from "../../../database/migrations/workflows/009_agent_artifacts.ts";
import { AgentRunRepository } from "../persistence/agent-run-repository.ts";
import { AgentArtifactRepository } from "./agent-artifact-repository.ts";

describe("AgentArtifactRepository", () => {
  it("persists profile-scoped metadata and lists expired artifacts", async () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createRuns(db);
    await createArtifacts(db);
    new AgentRunRepository(db).create({
      id: "run_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      userMessage: "download",
    });
    const repository = new AgentArtifactRepository(db);
    repository.create({
      id: "artifact_1",
      profileId: "profile_1",
      runId: "run_1",
      actionId: "action_from_engine_request",
      name: "X.mp4",
      mimeType: "video/mp4",
      size: 4,
      storageKey: "ab/artifact_1.bin",
      sha256: "abc123",
      expiresAt: "2026-01-02T00:00:00.000Z",
    });

    expect(repository.getById("profile_2", "artifact_1")).toBeNull();
    expect(repository.getById("profile_1", "artifact_1")).toMatchObject({
      ref: "artifact://artifact_1",
      name: "X.mp4",
      size: 4,
      actionId: "action_from_engine_request",
    });
    expect(repository.listExpired("profile_1", "2026-01-03T00:00:00.000Z"))
      .toHaveLength(1);
  });
});
