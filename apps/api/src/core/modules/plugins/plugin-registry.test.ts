import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import {
  isPluginEnabled,
  getPluginRegistryDatabase,
  resetPluginRegistryDatabaseProvider,
  setPluginRegistryDatabaseProvider,
  syncPluginRegistry,
} from "./plugin-registry.ts";

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.prepare(
    `
    CREATE TABLE registered_plugins (
      id TEXT PRIMARY KEY NOT NULL,
      plugin_id TEXT,
      version TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      installed_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      source TEXT NOT NULL DEFAULT 'internal',
      install_path TEXT,
      manifest_path TEXT
    )
  `,
  ).run();
  return db;
}

describe("plugin registry", () => {
  afterEach(() => {
    resetPluginRegistryDatabaseProvider();
  });

  it("inserts source and paths for new plugins", () => {
    const db = createDb();

    syncPluginRegistry(db, {
      id: "external-plugin",
      pluginId: "external-plugin",
      version: "2.0.0",
      source: "external",
      installPath: "C:/sailor/global/plugins/external-plugin",
      manifestPath: "C:/sailor/global/plugins/external-plugin/manifest.json",
    });

    const row = db.prepare("SELECT * FROM registered_plugins WHERE id = ?").get("external-plugin") as any;
    assert.equal(row.plugin_id, "external-plugin");
    assert.equal(row.version, "2.0.0");
    assert.equal(row.source, "external");
    assert.equal(row.install_path, "C:/sailor/global/plugins/external-plugin");
    assert.equal(row.manifest_path, "C:/sailor/global/plugins/external-plugin/manifest.json");
    assert.equal(row.is_enabled, 1);

    db.close();
  });

  it("uses the active database provider so registry rows and enabled state stay isolated by profile", () => {
    const profileA = createDb();
    const profileB = createDb();

    setPluginRegistryDatabaseProvider(() => profileA);
    syncPluginRegistry(getPluginRegistryDatabase(), {
      id: "external-plugin",
      pluginId: "external",
      version: "1.0.0",
      source: "external",
      installPath: "C:/plugins/external-plugin",
      manifestPath: "C:/plugins/external-plugin/manifest.json",
    });
    profileA
      .prepare("UPDATE registered_plugins SET is_enabled = 0 WHERE id = ?")
      .run("external-plugin");

    setPluginRegistryDatabaseProvider(() => profileB);
    assert.equal(isPluginEnabled(getPluginRegistryDatabase(), "external-plugin"), true);
    const profileBCount = profileB
      .prepare("SELECT COUNT(*) AS count FROM registered_plugins")
      .get() as { count: number };
    assert.equal(profileBCount.count, 0);

    syncPluginRegistry(getPluginRegistryDatabase(), {
      id: "external-plugin",
      pluginId: "external",
      version: "2.0.0",
      source: "external",
      installPath: "C:/plugins/external-plugin-b",
      manifestPath: "C:/plugins/external-plugin-b/manifest.json",
    });

    setPluginRegistryDatabaseProvider(() => profileA);
    assert.equal(isPluginEnabled(getPluginRegistryDatabase(), "external-plugin"), false);
    const profileARow = profileA
      .prepare("SELECT version FROM registered_plugins WHERE id = ?")
      .get("external-plugin") as { version: string };
    assert.equal(profileARow.version, "1.0.0");

    setPluginRegistryDatabaseProvider(() => profileB);
    assert.equal(isPluginEnabled(getPluginRegistryDatabase(), "external-plugin"), true);
    const profileBRow = profileB
      .prepare("SELECT version FROM registered_plugins WHERE id = ?")
      .get("external-plugin") as { version: string };
    assert.equal(profileBRow.version, "2.0.0");

    profileA.close();
    profileB.close();
  });

  it("updates metadata without overwriting disabled state", () => {
    const db = createDb();
    db.prepare(
      "INSERT INTO registered_plugins (id, version, is_enabled, source) VALUES (?, ?, ?, ?)",
    ).run("telegram", "1.0.0", 0, "internal");

    syncPluginRegistry(db, {
      id: "telegram",
      pluginId: "telegram",
      version: "1.1.0",
      source: "internal",
      installPath: null,
      manifestPath: null,
    });

    const row = db.prepare("SELECT version, is_enabled FROM registered_plugins WHERE id = ?").get("telegram") as any;
    assert.equal(row.version, "1.1.0");
    assert.equal(row.is_enabled, 0);
    assert.equal(isPluginEnabled(db, "telegram"), false);

    db.close();
  });

  it("stores external install ids separately from original manifest plugin ids", () => {
    const db = createDb();

    syncPluginRegistry(db, {
      id: "github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      pluginId: "github-tools",
      version: "1.0.0",
      source: "external",
      installPath: "C:/sailor/global/plugins/github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      manifestPath: "C:/sailor/global/plugins/github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/manifest.json",
    });
    syncPluginRegistry(db, {
      id: "github-tools-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      pluginId: "github-tools",
      version: "1.0.0",
      source: "external",
      installPath: "C:/sailor/global/plugins/github-tools-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      manifestPath: "C:/sailor/global/plugins/github-tools-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/manifest.json",
    });

    const rows = db.prepare("SELECT id, plugin_id FROM registered_plugins ORDER BY id").all() as any[];

    assert.deepEqual(rows, [
      {
        id: "github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        plugin_id: "github-tools",
      },
      {
        id: "github-tools-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        plugin_id: "github-tools",
      },
    ]);
    db.close();
  });
});
