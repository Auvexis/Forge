import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  /**
   * Global Variables table.
   * These are environment-like variables accessible in any workflow via {{env.KEY}}.
   * They are completely generic — no plugin logic lives here.
   *
   * Example rows:
   *   ('SLACK_CHANNEL', '#alerts', 'Default Slack channel for notifications')
   *   ('BASE_URL', 'https://myapp.com', '')
   */
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS global_variables (
      key         TEXT PRIMARY KEY NOT NULL,
      value       TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `,
  ).run();
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare(`DROP TABLE IF EXISTS global_variables`).run();
}
