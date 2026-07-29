import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    ALTER TABLE agent_runs ADD COLUMN lease_owner TEXT;
    ALTER TABLE agent_runs ADD COLUMN lease_expires_at TEXT;
    ALTER TABLE agent_runs ADD COLUMN heartbeat_at TEXT;

    CREATE INDEX IF NOT EXISTS idx_agent_runs_lease
      ON agent_runs(state, lease_expires_at);
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec(`DROP INDEX IF EXISTS idx_agent_runs_lease;`);
}
