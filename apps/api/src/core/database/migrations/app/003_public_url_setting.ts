import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  const value = process.env.FABRIC_PUBLIC_URL?.trim() || process.env.PUBLIC_URL?.trim();
  if (!value) return;

  db.prepare(
    `
    INSERT INTO settings (key, value, updated_at)
    VALUES ('public_url', ?, datetime('now'))
    ON CONFLICT(key) DO NOTHING
  `,
  ).run(JSON.stringify(value));
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare(`DELETE FROM settings WHERE key = 'public_url'`).run();
}
