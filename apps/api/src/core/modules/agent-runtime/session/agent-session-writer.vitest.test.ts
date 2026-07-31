import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { up as createLegacyChat } from "../../../database/migrations/workflows/005_agent_runtime_tables.ts";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createParts } from "../../../database/migrations/workflows/014_agent_session_parts.ts";
import { up as replaceChat } from "../../../database/migrations/workflows/015_replace_agent_chat_storage.ts";
import { AgentSessionRepository } from "./agent-session-repository.ts";
import { AgentSessionWriter } from "./agent-session-writer.ts";

describe("AgentSessionWriter", () => {
  let db: Database.Database | undefined;
  afterEach(() => db?.close());

  it("persists a tool before execution and every subsequent transition", async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createLegacyChat(db);
    await createRuns(db);
    await createParts(db);
    await replaceChat(db);
    const repository = new AgentSessionRepository(db, () => "2026-07-29T00:00:00.000Z");
    const session = repository.createSession({
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
    });
    const writer = new AgentSessionWriter(
      repository,
      "profile_1",
      "session_1",
      session.revision,
      () => "2026-07-29T00:00:00.000Z",
    );
    const turn = writer.createTurn();
    const message = writer.appendMessage(turn.id, "assistant");
    const pending = writer.appendTool({
      turnId: turn.id,
      messageId: message.id,
      callId: "call_1",
      toolName: "drive_download",
      arguments: { file: "X.mp4" },
    });
    const running = writer.startTool(pending, { file: "X.mp4" });
    writer.completeTool(running, { artifact: "artifact://video" });

    const tool = repository.getSnapshot({
      profileId: "profile_1",
      sessionId: "session_1",
    }).messages[0]?.parts[0];
    expect(tool).toMatchObject({
      type: "tool",
      callId: "call_1",
      state: {
        status: "completed",
        output: { artifact: "artifact://video" },
      },
    });
    expect(writer.currentRevision).toBe(6);
  });

  it("persists and resolves a human interaction as a message part", async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createLegacyChat(db);
    await createRuns(db);
    await createParts(db);
    await replaceChat(db);
    const repository = new AgentSessionRepository(db, () => "2026-07-29T00:00:00.000Z");
    const session = repository.createSession({
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
    });
    const writer = new AgentSessionWriter(repository, "profile_1", "session_1", session.revision);
    const turn = writer.createTurn();
    const message = writer.appendMessage(turn.id, "assistant");
    const pending = writer.appendInteraction({
      turnId: turn.id,
      messageId: message.id,
      kind: "clarification",
      question: "Qual arquivo?",
    });
    writer.resolveInteraction(pending, { file: "X.mp4" });

    expect(repository.getSnapshot({
      profileId: "profile_1",
      sessionId: "session_1",
    }).messages[0]?.parts[0]).toMatchObject({
      type: "interaction",
      state: "resolved",
      response: { file: "X.mp4" },
    });
  });

  it("persists terminal errors as durable message parts", async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createLegacyChat(db);
    await createRuns(db);
    await createParts(db);
    await replaceChat(db);
    const repository = new AgentSessionRepository(db);
    const session = repository.createSession({
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
    });
    const writer = new AgentSessionWriter(repository, "profile_1", "session_1", session.revision);
    const turn = writer.createTurn();
    const message = writer.appendMessage(turn.id, "assistant");
    writer.appendError({
      turnId: turn.id,
      messageId: message.id,
      error: {
        code: "AGENT_MODEL_TIMEOUT",
        category: "temporary",
        message: "Model timed out",
        retryable: true,
        userActionRequired: false,
      },
    });

    expect(repository.getSnapshot({
      profileId: "profile_1",
      sessionId: "session_1",
    }).messages[0]?.parts[0]).toMatchObject({
      type: "error",
      error: { code: "AGENT_MODEL_TIMEOUT", message: "Model timed out" },
    });
  });

  it("persists a final assistant message only once per turn", async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createLegacyChat(db);
    await createRuns(db);
    await createParts(db);
    await replaceChat(db);
    const repository = new AgentSessionRepository(db);
    const session = repository.createSession({
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
    });
    const writer = new AgentSessionWriter(repository, "profile_1", "session_1", session.revision);
    const turn = writer.createTurn();
    const first = writer.appendFinalTextOnce({ turnId: turn.id, text: "Concluído." });
    const duplicate = writer.appendFinalTextOnce({ turnId: turn.id, text: " Concluído. " });

    expect(duplicate.id).toBe(first.id);
    const texts = repository.getSnapshot({
      profileId: "profile_1",
      sessionId: "session_1",
    }).messages.flatMap((entry) => entry.parts).filter((part) => part.type === "text");
    expect(texts).toHaveLength(1);
  });
});
