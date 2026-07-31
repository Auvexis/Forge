import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  const columns = new Set(
    (db.prepare(`PRAGMA table_info(agent_engine_requests)`).all() as Array<{ name: string }>)
      .map((column) => column.name),
  );
  const additions = [
    ["attempt", "INTEGER NOT NULL DEFAULT 0"],
    ["max_attempts", "INTEGER NOT NULL DEFAULT 3"],
    ["lease_owner", "TEXT"],
    ["lease_expires_at", "TEXT"],
    ["next_retry_at", "TEXT"],
    ["last_error", "TEXT"],
  ] as const;
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE agent_engine_requests ADD COLUMN ${name} ${definition}`);
    }
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_engine_requests_recovery
      ON agent_engine_requests(status, lease_expires_at, next_retry_at, created_at);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec(`DROP INDEX IF EXISTS idx_agent_engine_requests_recovery`);
}
