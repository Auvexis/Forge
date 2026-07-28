import type Database from "better-sqlite3";
import { addColumnIfMissing, columnExists } from "../../sqlite-schema.ts";

export async function up(db: Database.Database): Promise<void> {
  // published_at tracks the last time this workflow was explicitly published
  // by the user. NULL means it was never published (draft or unpublished).
  addColumnIfMissing(db, "workflows", "published_at", "TEXT");
}

export async function down(db: Database.Database): Promise<void> {
  if (!columnExists(db, "workflows", "published_at")) return;

  // SQLite does not support DROP COLUMN in older versions,
  // but better-sqlite3 uses SQLite >= 3.35 which does.
  db.prepare(`ALTER TABLE workflows DROP COLUMN published_at`).run();
}
