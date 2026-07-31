import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_continuations (
      run_id TEXT PRIMARY KEY,
      metadata_json TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    );
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec("DROP TABLE IF EXISTS agent_continuations;");
}
