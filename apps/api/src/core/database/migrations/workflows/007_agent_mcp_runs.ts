import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      execution_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      session_id TEXT,
      user_message TEXT NOT NULL,
      state TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_agent_runs_session
      ON agent_runs(profile_id, workflow_id, node_id, session_id, updated_at);

    CREATE INDEX IF NOT EXISTS idx_agent_runs_execution
      ON agent_runs(profile_id, execution_id);

    CREATE TABLE IF NOT EXISTS agent_actions (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      objective TEXT NOT NULL,
      depends_on_json TEXT NOT NULL,
      state TEXT NOT NULL,
      arguments_json TEXT,
      output_json TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
      UNIQUE(run_id, position)
    );

    CREATE INDEX IF NOT EXISTS idx_agent_actions_run_state
      ON agent_actions(run_id, state, position);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_actions_run_state;
    DROP TABLE IF EXISTS agent_actions;
    DROP INDEX IF EXISTS idx_agent_runs_execution;
    DROP INDEX IF EXISTS idx_agent_runs_session;
    DROP TABLE IF EXISTS agent_runs;
  `);
}
