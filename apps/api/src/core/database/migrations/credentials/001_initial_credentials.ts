import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS plugin_credentials (
      plugin_id  TEXT PRIMARY KEY NOT NULL,
      fields     TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `,
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS plugin_tokens (
      plugin_id  TEXT PRIMARY KEY NOT NULL,
      tokens     TEXT NOT NULL DEFAULT '{}',
      expires_at INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `,
  ).run();
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare(`DROP TABLE IF EXISTS plugin_tokens`).run();
  db.prepare(`DROP TABLE IF EXISTS plugin_credentials`).run();
}
