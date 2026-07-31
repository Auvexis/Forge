import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_engine_responses_tool_call
      ON agent_engine_responses(run_id, tool_call_id);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec("DROP INDEX IF EXISTS idx_agent_engine_responses_tool_call;");
}
