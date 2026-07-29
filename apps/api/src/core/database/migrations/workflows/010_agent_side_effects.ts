import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_side_effects (
      idempotency_key TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      action_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      arguments_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      owner_token TEXT NOT NULL,
      attempt INTEGER NOT NULL DEFAULT 1,
      lease_expires_at TEXT NOT NULL,
      result_json TEXT,
      error_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_side_effects_run
      ON agent_side_effects(profile_id, run_id, action_id);

    CREATE INDEX IF NOT EXISTS idx_agent_side_effects_lease
      ON agent_side_effects(status, lease_expires_at);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_side_effects_lease;
    DROP INDEX IF EXISTS idx_agent_side_effects_run;
    DROP TABLE IF EXISTS agent_side_effects;
  `);
}
