import type Database from "better-sqlite3";

export type PluginSource = "internal" | "external";

export interface SyncPluginRegistryInput {
  id: string;
  version: string;
  source: PluginSource;
  installPath: string | null;
  manifestPath: string | null;
}

export function syncPluginRegistry(
  db: Database.Database,
  input: SyncPluginRegistryInput,
): void {
  const existing = db
    .prepare("SELECT id, is_enabled FROM registered_plugins WHERE id = ?")
    .get(input.id) as { id: string; is_enabled: number } | undefined;

  if (existing) {
    db.prepare(
      `
      UPDATE registered_plugins
      SET version = ?,
          source = ?,
          install_path = ?,
          manifest_path = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `,
    ).run(input.version, input.source, input.installPath, input.manifestPath, input.id);
    return;
  }

  db.prepare(
    `
    INSERT INTO registered_plugins (id, version, source, install_path, manifest_path)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(input.id, input.version, input.source, input.installPath, input.manifestPath);
}

export function isPluginEnabled(db: Database.Database, id: string): boolean {
  const row = db
    .prepare("SELECT is_enabled FROM registered_plugins WHERE id = ?")
    .get(id) as { is_enabled: number } | undefined;

  return row ? row.is_enabled === 1 : true;
}
