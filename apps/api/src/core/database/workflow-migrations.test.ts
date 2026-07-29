import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { up as initialWorkflows } from "./migrations/workflows/001_initial_workflows.ts";
import { up as addPublishedAt } from "./migrations/workflows/002_add_published_at.ts";
import { up as addLastTriggerPayload } from "./migrations/workflows/003_add_last_trigger_payload.ts";
import { up as addAgentRuntimeTables } from "./migrations/workflows/005_agent_runtime_tables.ts";
import { up as removeAgentPanelStructures } from "./migrations/workflows/013_remove_agent_panel_structures.ts";

describe("workflow migrations", () => {
  it("keeps additive column migrations idempotent for partially migrated databases", async () => {
    const db = new Database(":memory:");

    try {
      await initialWorkflows(db);
      db.prepare("ALTER TABLE workflows ADD COLUMN published_at TEXT").run();
      db.prepare("ALTER TABLE workflows ADD COLUMN last_trigger_payload JSON").run();

      await addPublishedAt(db);
      await addLastTriggerPayload(db);

      const columns = db.prepare("PRAGMA table_info(workflows)").all() as Array<{ name: string }>;
      assert.equal(columns.filter((column) => column.name === "published_at").length, 1);
      assert.equal(columns.filter((column) => column.name === "last_trigger_payload").length, 1);
    } finally {
      db.close();
    }
  });

  it("removes legacy Agent Panel columns without removing chat trigger storage", async () => {
    const db = new Database(":memory:");

    try {
      await addAgentRuntimeTables(db);
      db.exec(`
        ALTER TABLE agent_chat_sessions ADD COLUMN agent_node_id TEXT;
        ALTER TABLE agent_chat_sessions ADD COLUMN agent_key TEXT;
        CREATE INDEX idx_agent_chat_sessions_agent_key
          ON agent_chat_sessions(profile_id, agent_key, updated_at);
      `);

      await removeAgentPanelStructures(db);

      const columns = db.prepare("PRAGMA table_info(agent_chat_sessions)").all() as Array<{ name: string }>;
      assert.equal(columns.some(({ name }) => name === "agent_node_id"), false);
      assert.equal(columns.some(({ name }) => name === "agent_key"), false);
      assert.equal(
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'agent_chat_sessions'").get() !== undefined,
        true,
      );
    } finally {
      db.close();
    }
  });
});
