import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { up as createLegacyChat } from "./migrations/workflows/005_agent_runtime_tables.ts";
import { up as createRuns } from "./migrations/workflows/007_agent_mcp_runs.ts";
import { up as createParts } from "./migrations/workflows/014_agent_session_parts.ts";
import { up } from "./migrations/workflows/015_replace_agent_chat_storage.ts";

describe("replace agent chat storage migration", () => {
  let db: Database.Database | undefined;

  afterEach(() => db?.close());

  it("removes legacy chat data and creates clean session storage", async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createLegacyChat(db);
    await createRuns(db);
    await createParts(db);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO agent_chat_sessions
        (id, profile_id, workflow_id, trigger_node_id, title, status, created_at, updated_at)
      VALUES ('legacy_session', 'profile_1', 'workflow_1', 'trigger_1', 'Legacy', 'active', ?, ?)
    `).run(now, now);
    db.prepare(`
      INSERT INTO agent_chat_messages
        (id, session_id, profile_id, role, content_json, created_at)
      VALUES ('legacy_message', 'legacy_session', 'profile_1', 'user', '"hello"', ?)
    `).run(now);

    await up(db);

    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'agent_%'
    `).all() as Array<{ name: string }>;
    const names = new Set(tables.map((row) => row.name));

    expect(names.has("agent_chat_sessions")).toBe(false);
    expect(names.has("agent_chat_messages")).toBe(false);
    expect(names.has("agent_sessions")).toBe(true);
    expect(db.prepare("SELECT COUNT(*) AS count FROM agent_sessions").get()).toEqual({ count: 0 });
  });
});
