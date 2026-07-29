import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { up } from "./007_agent_mcp_runs.ts";

describe("agent MCP run migration", () => {
  it("creates durable run and action tables with foreign keys", async () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await up(db);

    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name IN ('agent_runs', 'agent_actions')
      ORDER BY name
    `).all() as Array<{ name: string }>;
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list(agent_actions)`).all() as Array<{ table: string }>;

    expect(tables.map((row) => row.name)).toEqual(["agent_actions", "agent_runs"]);
    expect(foreignKeys.some((row) => row.table === "agent_runs")).toBe(true);
    db.close();
  });
});
