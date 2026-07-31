import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { up as createSessions } from "../../../database/migrations/workflows/005_agent_sessions.ts";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import type { AgentTextPart } from "./agent-session-contracts.ts";
import { AgentSessionRepository } from "./agent-session-repository.ts";

describe("AgentSessionRepository", () => {
  let db: Database.Database | undefined;

  afterEach(() => db?.close());

  async function setup() {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createSessions(db);
    await createRuns(db);
    return new AgentSessionRepository(db, () => "2026-07-29T00:00:00.000Z");
  }

  it("updates session revision with every child mutation", async () => {
    const repository = await setup();
    const session = repository.createSession({
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
    });
    expect(session.revision).toBe(1);

    repository.createTurn({
      id: "turn_1",
      profileId: "profile_1",
      sessionId: "session_1",
      state: "running",
      expectedRevision: 1,
    });
    repository.appendMessage({
      id: "message_1",
      profileId: "profile_1",
      sessionId: "session_1",
      turnId: "turn_1",
      role: "assistant",
      expectedRevision: 2,
    });
    const part: AgentTextPart = {
      id: "part_1",
      sessionId: "session_1",
      turnId: "turn_1",
      messageId: "message_1",
      type: "text",
      sequence: 1,
      text: "Hello",
      state: "streaming",
      createdAt: "2026-07-29T00:00:00.000Z",
      updatedAt: "2026-07-29T00:00:00.000Z",
    };
    repository.appendPart({ profileId: "profile_1", expectedRevision: 3, part });

    expect(repository.getSession("profile_1", "session_1")?.revision).toBe(4);
    expect(() => repository.updateTurn({
      profileId: "profile_1",
      sessionId: "session_1",
      turnId: "turn_1",
      state: "completed",
      expectedRevision: 3,
    })).toThrow(/revision conflict/);
  });

  it("hydrates paginated messages and a recoverable snapshot", async () => {
    const repository = await setup();
    repository.createSession({
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
    });
    repository.createTurn({
      id: "turn_1",
      profileId: "profile_1",
      sessionId: "session_1",
      state: "running",
      expectedRevision: 1,
    });
    repository.appendMessage({
      id: "message_1",
      profileId: "profile_1",
      sessionId: "session_1",
      turnId: "turn_1",
      role: "user",
      expectedRevision: 2,
    });
    repository.appendPart({
      profileId: "profile_1",
      expectedRevision: 3,
      part: {
        id: "part_1",
        sessionId: "session_1",
        turnId: "turn_1",
        messageId: "message_1",
        type: "text",
        sequence: 1,
        text: "Download X.mp4",
        state: "completed",
        createdAt: "2026-07-29T00:00:00.000Z",
        updatedAt: "2026-07-29T00:00:00.000Z",
      },
    });

    const snapshot = repository.getSnapshot({
      profileId: "profile_1",
      sessionId: "session_1",
    });

    expect(snapshot.revision).toBe(4);
    expect(snapshot.activeTurn?.id).toBe("turn_1");
    expect(snapshot.messages[0]?.parts[0]).toMatchObject({
      type: "text",
      text: "Download X.mp4",
    });
  });
});
