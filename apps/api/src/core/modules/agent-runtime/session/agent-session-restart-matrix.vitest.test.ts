import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createMigrationEngine } from "../../../database/migration-engine.ts";
import type { AgentTurnState } from "./agent-session-contracts.ts";
import { AgentSessionRepository } from "./agent-session-repository.ts";
import { AgentSessionWriter } from "./agent-session-writer.ts";

describe("agent session restart matrix", () => {
  const directories: string[] = [];

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  for (const state of [
    "queued",
    "running",
    "waiting-user",
    "waiting-approval",
    "completed",
    "failed",
    "cancelled",
  ] satisfies AgentTurnState[]) {
    it(`restores ${state} without reconstructing state from events`, async () => {
      const directory = mkdtempSync(join(tmpdir(), "fabric-agent-restart-"));
      directories.push(directory);
      const databasePath = join(directory, "workflows.sqlite");
      let db = new Database(databasePath);
      db.pragma("foreign_keys = ON");
      await createMigrationEngine(db, "workflows").up();
      const repository = new AgentSessionRepository(db);
      const session = repository.createSession({
        id: `session_${state}`,
        profileId: "profile_1",
        workflowId: "workflow_1",
        triggerNodeId: "trigger_1",
        title: state,
      });
      const writer = new AgentSessionWriter(
        repository,
        "profile_1",
        session.id,
        session.revision,
      );
      const turn = writer.createTurn({ state });
      const message = writer.appendMessage(turn.id, "assistant");
      writer.appendText({
        turnId: turn.id,
        messageId: message.id,
        text: `durable:${state}`,
      });
      const expectedRevision = writer.currentRevision;
      db.close();

      db = new Database(databasePath);
      db.pragma("foreign_keys = ON");
      const restarted = new AgentSessionRepository(db);
      const snapshot = restarted.getSnapshot({
        profileId: "profile_1",
        sessionId: session.id,
      });
      const persistedTurn = db.prepare(
        "SELECT state FROM agent_session_turns WHERE id = ?",
      ).get(turn.id) as { state: AgentTurnState };

      expect(snapshot.revision).toBe(expectedRevision);
      expect(persistedTurn.state).toBe(state);
      expect(snapshot.messages[0]?.parts[0]).toMatchObject({
        type: "text",
        text: `durable:${state}`,
      });
      if (state === "completed" || state === "failed" || state === "cancelled") {
        expect(snapshot.activeTurn).toBeNull();
      } else {
        expect(snapshot.activeTurn?.state).toBe(state);
      }
      db.close();
    });
  }
});
