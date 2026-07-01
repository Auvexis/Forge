import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import type { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { AgentRuntimeError } from "../agent-errors.ts";
import {
  createAgentCheckpointer,
  deleteAgentCheckpoints,
  toLangGraphThreadConfig,
} from "./agent-checkpointer.ts";

describe("agent checkpointer", () => {
  it("creates a profile-scoped sqlite saver and sets up tables before use", async () => {
    const workspace = createTempWorkspace();
    const dbPath = path.join(workspace, "profile-agent-checkpoints.sqlite");
    let checkpointer: SqliteSaver | undefined;

    try {
      checkpointer = await createAgentCheckpointer({ dbPath });

      assert.ok(checkpointer);

      const db = new Database(dbPath, { readonly: true });
      try {
        const tables = db
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
          .all()
          .map((row) => (row as { name: string }).name);

        assert.deepEqual(tables, ["checkpoints", "writes"]);
      } finally {
        db.close();
      }
    } finally {
      checkpointer?.db.close();
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("uses the Sailor chat session id as the LangGraph thread id", () => {
    assert.deepEqual(toLangGraphThreadConfig("chat_profile-1_run_2"), {
      configurable: { thread_id: "chat_profile-1_run_2" },
    });
  });

  it("rejects unsafe thread ids", () => {
    assert.throws(
      () => toLangGraphThreadConfig("workflow_123"),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_CHECKPOINT_THREAD_INVALID",
    );

    assert.throws(() => toLangGraphThreadConfig("chat_profile/../other"));
  });

  it("can delete all checkpoints for a session", async () => {
    const workspace = createTempWorkspace();
    const dbPath = path.join(workspace, "profile-agent-checkpoints.sqlite");
    let checkpointer: SqliteSaver | undefined;

    try {
      checkpointer = await createAgentCheckpointer({ dbPath });
      const config = toLangGraphThreadConfig("chat_session_1");

      await checkpointer.put(config, checkpoint("00000000-0000-4000-8000-000000000001"), {
        source: "input",
        step: 1,
        parents: {},
      });

      assert.ok(await checkpointer.getTuple(config));

      await deleteAgentCheckpoints(checkpointer, "chat_session_1");

      assert.equal(await checkpointer.getTuple(config), undefined);
    } finally {
      checkpointer?.db.close();
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

function createTempWorkspace(): string {
  return mkdtempSync(path.join(tmpdir(), "sailor-agent-checkpointer-"));
}

function checkpoint(id: string): any {
  return {
    v: 1,
    id,
    ts: new Date("2026-05-25T00:00:00.000Z").toISOString(),
    channel_values: { messages: [] },
    channel_versions: { __start__: 1 },
    versions_seen: { __input__: {} },
    pending_sends: [],
  };
}
