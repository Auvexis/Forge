import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`ALTER TABLE agent_runs ADD COLUMN tool_catalog_json TEXT;`);
}

export async function down(_db: Database.Database): Promise<void> {
  // SQLite cannot safely drop a column on older embedded versions.
}
