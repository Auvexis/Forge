import type Database from "better-sqlite3";

export type PluginSource = "internal" | "external";

export interface SyncPluginRegistryInput {
  id: string;
  pluginId?: string;
  version: string;
  source: PluginSource;
  installPath: string | null;
  manifestPath: string | null;
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some((existing) => existing.name === column);
}

export function syncPluginRegistry(
  db: Database.Database,
  input: SyncPluginRegistryInput,
): void {
  const supportsPluginId = hasColumn(db, "registered_plugins", "plugin_id");
  const pluginId = input.pluginId ?? input.id;
  const existing = db
    .prepare("SELECT id, is_enabled FROM registered_plugins WHERE id = ?")
    .get(input.id) as { id: string; is_enabled: number } | undefined;

  if (existing) {
    if (supportsPluginId) {
      db.prepare(
        `
        UPDATE registered_plugins
        SET plugin_id = ?,
            version = ?,
            source = ?,
            install_path = ?,
            manifest_path = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `,
      ).run(pluginId, input.version, input.source, input.installPath, input.manifestPath, input.id);
      return;
    }

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

  if (supportsPluginId) {
    db.prepare(
      `
      INSERT INTO registered_plugins (id, plugin_id, version, source, install_path, manifest_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(input.id, pluginId, input.version, input.source, input.installPath, input.manifestPath);
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
