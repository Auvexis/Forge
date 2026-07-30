import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { up as createLegacyChat } from "./migrations/workflows/005_agent_runtime_tables.ts";
import { up as createRuns } from "./migrations/workflows/007_agent_mcp_runs.ts";
import { up } from "./migrations/workflows/014_agent_session_parts.ts";

describe("agent session parts migration", () => {
  let db: Database.Database | undefined;

  afterEach(() => db?.close());

  it("creates normalized session tables and a revision", async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createLegacyChat(db);
    await createRuns(db);
    await up(db);

    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name LIKE 'agent_%'
    `).all() as Array<{ name: string }>;
    const names = new Set(tables.map((row) => row.name));
    const columns = db.prepare("PRAGMA table_info(agent_chat_sessions)").all() as Array<{ name: string }>;

    expect(names).toEqual(expect.objectContaining(new Set([
      "agent_session_turns",
      "agent_session_messages",
      "agent_message_parts",
    ])));
    expect(columns.some((column) => column.name === "revision")).toBe(true);
  });

  it("is idempotent and enforces stable tool call identity", async () => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createLegacyChat(db);
    await createRuns(db);
    await up(db);
    await up(db);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO agent_chat_sessions
        (id, profile_id, workflow_id, trigger_node_id, title, status, created_at, updated_at)
      VALUES ('session_1', 'profile_1', 'workflow_1', 'trigger_1', 'Session', 'active', ?, ?)
    `).run(now, now);
    db.prepare(`
      INSERT INTO agent_session_turns
        (id, session_id, state, sequence, created_at, updated_at)
      VALUES ('turn_1', 'session_1', 'running', 1, ?, ?)
    `).run(now, now);
    db.prepare(`
      INSERT INTO agent_session_messages
        (id, session_id, turn_id, role, sequence, created_at)
      VALUES ('message_1', 'session_1', 'turn_1', 'assistant', 1, ?)
    `).run(now);

    const insert = db.prepare(`
      INSERT INTO agent_message_parts
        (id, session_id, turn_id, message_id, type, sequence, data_json, created_at, updated_at)
      VALUES (?, 'session_1', 'turn_1', 'message_1', 'tool', ?, ?, ?, ?)
    `);
    insert.run("part_1", 1, JSON.stringify({ callId: "call_1" }), now, now);

    expect(() => insert.run(
      "part_2",
      2,
      JSON.stringify({ callId: "call_1" }),
      now,
      now,
    )).toThrow();
  });
});
