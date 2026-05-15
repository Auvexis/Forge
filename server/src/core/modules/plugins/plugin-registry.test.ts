import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import {
  isPluginEnabled,
  syncPluginRegistry,
} from "./plugin-registry.ts";

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.prepare(
    `
    CREATE TABLE registered_plugins (
      id TEXT PRIMARY KEY NOT NULL,
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
  it("inserts source and paths for new plugins", () => {
    const db = createDb();

    syncPluginRegistry(db, {
      id: "external-plugin",
      version: "2.0.0",
      source: "external",
      installPath: "C:/nd8/global/plugins/external-plugin",
      manifestPath: "C:/nd8/global/plugins/external-plugin/manifest.json",
    });

    const row = db.prepare("SELECT * FROM registered_plugins WHERE id = ?").get("external-plugin") as any;
    assert.equal(row.version, "2.0.0");
    assert.equal(row.source, "external");
    assert.equal(row.install_path, "C:/nd8/global/plugins/external-plugin");
    assert.equal(row.manifest_path, "C:/nd8/global/plugins/external-plugin/manifest.json");
    assert.equal(row.is_enabled, 1);

    db.close();
  });

  it("updates metadata without overwriting disabled state", () => {
    const db = createDb();
    db.prepare(
      "INSERT INTO registered_plugins (id, version, is_enabled, source) VALUES (?, ?, ?, ?)",
    ).run("telegram", "1.0.0", 0, "internal");

    syncPluginRegistry(db, {
      id: "telegram",
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
});
