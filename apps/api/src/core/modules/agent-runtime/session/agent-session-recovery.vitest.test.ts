import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { up as createSessions } from "../../../database/migrations/workflows/005_agent_sessions.ts";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { AgentSessionRecovery } from "./agent-session-recovery.ts";
import { AgentSessionRepository } from "./agent-session-repository.ts";
import { AgentSessionWriter } from "./agent-session-writer.ts";

describe("AgentSessionRecovery", () => {
  let db: Database.Database | undefined;
  afterEach(() => db?.close());

  it("turns a running tool into a durable retryable error after restart", async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createSessions(db);
    await createRuns(db);
    const now = () => "2026-07-29T00:00:00.000Z";
    const firstProcess = new AgentSessionRepository(db, now);
    const session = firstProcess.createSession({
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
    });
    const writer = new AgentSessionWriter(firstProcess, "profile_1", "session_1", session.revision, now);
    const turn = writer.createTurn();
    const message = writer.appendMessage(turn.id, "assistant");
    const pending = writer.appendTool({
      turnId: turn.id,
      messageId: message.id,
      callId: "call_1",
      toolName: "drive_download",
      arguments: { file: "X.mp4" },
    });
    writer.startTool(pending, { file: "X.mp4" });

    const restartedProcess = new AgentSessionRepository(db, now);
    const recovered = new AgentSessionRecovery(restartedProcess, now).reconcileInterrupted({
      profileId: "profile_1",
      sessionId: "session_1",
    });
    const snapshot = restartedProcess.getSnapshot({
      profileId: "profile_1",
      sessionId: "session_1",
    });

    expect(recovered.recoveredToolParts).toBe(1);
    expect(snapshot.activeTurn).toBeNull();
    expect(snapshot.messages[0]?.parts[0]).toMatchObject({
      type: "tool",
      state: {
        status: "error",
        error: {
          code: "AGENT_TOOL_INTERRUPTED",
          retryable: true,
        },
      },
    });
  });
});
