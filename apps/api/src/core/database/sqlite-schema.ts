import type Database from "better-sqlite3";

export function columnExists(
  db: Database.Database,
  tableName: string,
  columnName: string,
): boolean {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

export function addColumnIfMissing(
  db: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  if (columnExists(db, tableName, columnName)) return;
  db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
}
