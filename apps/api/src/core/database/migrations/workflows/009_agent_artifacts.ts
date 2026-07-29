import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_artifacts (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      action_id TEXT,
      name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER NOT NULL,
      storage_key TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
      FOREIGN KEY(action_id) REFERENCES agent_actions(id) ON DELETE SET NULL,
      UNIQUE(profile_id, storage_key)
    );

    CREATE INDEX IF NOT EXISTS idx_agent_artifacts_expiry
      ON agent_artifacts(profile_id, expires_at);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_artifacts_expiry;
    DROP TABLE IF EXISTS agent_artifacts;
  `);
}
