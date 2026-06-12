import type Database from "better-sqlite3";

/**
 * Adds the `last_trigger_payload` column to the `workflows` table.
 * This stores the raw JSON captured during a "Listen for Event" session,
 * enabling the left pane of the NodeInspector to display schema-less data.
 *
 * The column is nullable — it's only populated after a successful "listen" capture.
 */
export async function up(db: Database.Database): Promise<void> {
  db.prepare(
    `ALTER TABLE workflows ADD COLUMN last_trigger_payload JSON`
  ).run();
}

export async function down(db: Database.Database): Promise<void> {
  // SQLite does not support DROP COLUMN in older versions — we leave this as a no-op.
  // In practice, the column is just ignored if the feature is rolled back.
}
