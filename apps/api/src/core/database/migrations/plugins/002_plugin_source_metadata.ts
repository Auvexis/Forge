import type Database from "better-sqlite3";

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((existing) => existing.name === column)) return;

  db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

export async function up(db: Database.Database): Promise<void> {
  addColumnIfMissing(db, "registered_plugins", "source", "TEXT NOT NULL DEFAULT 'internal'");
  addColumnIfMissing(db, "registered_plugins", "install_path", "TEXT");
  addColumnIfMissing(db, "registered_plugins", "manifest_path", "TEXT");
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare(
    `
    CREATE TABLE registered_plugins_rollback (
      id           TEXT PRIMARY KEY NOT NULL,
      version      TEXT NOT NULL,
      is_enabled   INTEGER NOT NULL DEFAULT 1,
      installed_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `,
  ).run();

  db.prepare(
    `
    INSERT INTO registered_plugins_rollback (id, version, is_enabled, installed_at, updated_at)
    SELECT id, version, is_enabled, installed_at, updated_at FROM registered_plugins
  `,
  ).run();

  db.prepare("DROP TABLE registered_plugins").run();
  db.prepare("ALTER TABLE registered_plugins_rollback RENAME TO registered_plugins").run();
}
