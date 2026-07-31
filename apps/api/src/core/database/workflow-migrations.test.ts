import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { up as initialWorkflows } from "./migrations/workflows/001_initial_workflows.ts";
import { up as addPublishedAt } from "./migrations/workflows/002_add_published_at.ts";
import { up as addLastTriggerPayload } from "./migrations/workflows/003_add_last_trigger_payload.ts";
import { up as addAgentSessions } from "./migrations/workflows/005_agent_sessions.ts";

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

  it("creates only the canonical agent session storage", async () => {
    const db = new Database(":memory:");

    try {
      await addAgentSessions(db);
      const columns = db.prepare("PRAGMA table_info(agent_sessions)").all() as Array<{ name: string }>;
      assert.equal(columns.some(({ name }) => name === "revision"), true);
      assert.equal(
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'agent_chat_sessions'").get(),
        undefined,
      );
    } finally {
      db.close();
    }
  });
});
