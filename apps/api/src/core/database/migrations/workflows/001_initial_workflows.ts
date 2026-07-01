import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS workflows (
      id          TEXT PRIMARY KEY NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      version     TEXT NOT NULL,
      is_active   INTEGER NOT NULL DEFAULT 1,
      is_public   INTEGER NOT NULL DEFAULT 0,
      is_draft    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL,
      definition  JSON NOT NULL
    )
  `,
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS workflow_executions (
      id          TEXT PRIMARY KEY NOT NULL,
      workflow_id TEXT NOT NULL,
      status      TEXT NOT NULL,
      start_time  INTEGER NOT NULL,
      end_time    INTEGER,
      context_state JSON,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    )
  `,
  ).run();
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare(`DROP TABLE IF EXISTS workflow_executions`).run();
  db.prepare(`DROP TABLE IF EXISTS workflows`).run();
}
