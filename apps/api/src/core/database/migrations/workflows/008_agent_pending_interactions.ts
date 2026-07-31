import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_pending_interactions (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      action_id TEXT,
      kind TEXT NOT NULL,
      question TEXT NOT NULL,
      context_json TEXT NOT NULL,
      status TEXT NOT NULL,
      response_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_pending_interactions_active
      ON agent_pending_interactions(run_id)
      WHERE status = 'pending';

    CREATE INDEX IF NOT EXISTS idx_agent_pending_interactions_status
      ON agent_pending_interactions(run_id, status, created_at);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_pending_interactions_status;
    DROP INDEX IF EXISTS idx_agent_pending_interactions_active;
    DROP TABLE IF EXISTS agent_pending_interactions;
  `);
}
