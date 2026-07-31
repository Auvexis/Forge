import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_engine_requests_idempotency
      ON agent_engine_requests(run_id, idempotency_key);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec("DROP INDEX IF EXISTS idx_agent_engine_requests_idempotency;");
}
