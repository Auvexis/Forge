import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS oauth2_auth_sessions (
      state TEXT PRIMARY KEY NOT NULL,
      plugin_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_verifier TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `,
  ).run();

  db.prepare(
    `
    CREATE INDEX IF NOT EXISTS idx_oauth2_auth_sessions_expires_at
    ON oauth2_auth_sessions (expires_at)
  `,
  ).run();
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare("DROP TABLE IF EXISTS oauth2_auth_sessions").run();
}
