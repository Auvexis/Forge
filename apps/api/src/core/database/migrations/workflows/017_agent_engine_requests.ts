import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_engine_requests (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL,
      run_id TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      tool_call_id TEXT NOT NULL,
      action_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      plugin_id TEXT,
      method_id TEXT,
      arguments_json TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_metadata_json TEXT,
      attempt INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      lease_owner TEXT,
      lease_expires_at TEXT,
      next_retry_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_engine_requests_run
      ON agent_engine_requests(run_id, iteration, created_at);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_engine_requests_run;
    DROP TABLE IF EXISTS agent_engine_requests;
  `);
}
