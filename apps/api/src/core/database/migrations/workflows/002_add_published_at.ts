import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  // published_at tracks the last time this workflow was explicitly published
  // by the user. NULL means it was never published (draft or unpublished).
  db.prepare(
    `ALTER TABLE workflows ADD COLUMN published_at TEXT`,
  ).run();
}

export async function down(db: Database.Database): Promise<void> {
  // SQLite does not support DROP COLUMN in older versions,
  // but better-sqlite3 uses SQLite >= 3.35 which does.
  db.prepare(`ALTER TABLE workflows DROP COLUMN published_at`).run();
}
