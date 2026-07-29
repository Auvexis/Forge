import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createInteractions } from "../../../database/migrations/workflows/008_agent_pending_interactions.ts";
import { AgentRunRepository } from "./agent-run-repository.ts";
import { AgentPendingInteractionRepository } from "./agent-pending-interaction-repository.ts";

describe("AgentPendingInteractionRepository", () => {
  let repository: AgentPendingInteractionRepository;

  beforeEach(async () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createRuns(db);
    await createInteractions(db);
    new AgentRunRepository(db).create({
      id: "run_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      sessionId: "session_1",
      userMessage: "send the file",
    });
    repository = new AgentPendingInteractionRepository(db);
  });

  it("finds and resolves a profile-scoped pending interaction", () => {
    repository.create({
      id: "interaction_1",
      runId: "run_1",
      kind: "clarification",
      question: "Which recipient?",
      context: { actionId: "action_1" },
    });

    expect(repository.getPendingForSession({
      profileId: "profile_1",
      workflowId: "workflow_1",
      nodeId: "agent_1",
      sessionId: "session_1",
    })?.id).toBe("interaction_1");
    expect(repository.getPendingForSession({
      profileId: "profile_2",
      workflowId: "workflow_1",
      nodeId: "agent_1",
      sessionId: "session_1",
    })).toBeNull();
    expect(repository.resolve({
      profileId: "profile_1",
      id: "interaction_1",
      response: "person@example.com",
    }).status).toBe("resolved");
  });

  it("allows only one pending interaction per run", () => {
    repository.create({
      id: "interaction_1",
      runId: "run_1",
      kind: "clarification",
      question: "Which recipient?",
      context: {},
    });

    expect(() => repository.create({
      id: "interaction_2",
      runId: "run_1",
      kind: "selection",
      question: "Which file?",
      context: {},
    })).toThrow(/already waiting/i);
  });
});
