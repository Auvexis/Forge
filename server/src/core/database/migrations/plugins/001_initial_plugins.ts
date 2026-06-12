import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  /**
   * Plugin registry table.
   *
   * This is the persistent source-of-truth for which plugins are installed
   * and whether they're enabled. The loader crosses this table with the
   * filesystem to determine which plugins to actually register at boot.
   *
   * Columns:
   *   - id         : kebab-case plugin id (e.g. 'google-calendar')
   *   - version    : semver string read from the manifest (e.g. '1.2.0')
   *   - is_enabled : 0 = disabled (skipped at load), 1 = enabled (default)
   *   - installed_at: ISO timestamp of first registration
   *   - updated_at : ISO timestamp of last status change
   */
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS registered_plugins (
      id           TEXT PRIMARY KEY NOT NULL,
      version      TEXT NOT NULL,
      is_enabled   INTEGER NOT NULL DEFAULT 1,
      installed_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `,
  ).run();
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare(`DROP TABLE IF EXISTS registered_plugins`).run();
}
