import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  /**
   * Generic key-value settings table.
   * `value` is stored as a JSON string to support any primitive or object.
   *
   * Example rows:
   *   ('theme', '"dark"')
   *   ('server_name', '"My Sailor"')
   *   ('telemetry_enabled', 'false')
   */
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY NOT NULL,
      value      TEXT NOT NULL DEFAULT 'null',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `,
  ).run();
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare(`DROP TABLE IF EXISTS settings`).run();
}
