import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_engine_responses (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      tool_call_id TEXT NOT NULL,
      status TEXT NOT NULL,
      output_json TEXT,
      error_json TEXT,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(request_id) REFERENCES agent_engine_requests(id) ON DELETE CASCADE,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
      UNIQUE(request_id)
    );

    CREATE INDEX IF NOT EXISTS idx_agent_engine_responses_run
      ON agent_engine_responses(run_id, created_at);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_engine_responses_run;
    DROP TABLE IF EXISTS agent_engine_responses;
  `);
}
