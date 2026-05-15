import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { up } from "./002_plugin_source_metadata.ts";

describe("002_plugin_source_metadata", () => {
  it("adds source and path metadata while preserving existing plugin rows", async () => {
    const db = new Database(":memory:");
    db.prepare(
      `
      CREATE TABLE registered_plugins (
        id TEXT PRIMARY KEY NOT NULL,
        version TEXT NOT NULL,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        installed_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `,
    ).run();
    db.prepare("INSERT INTO registered_plugins (id, version, is_enabled) VALUES (?, ?, ?)").run(
      "telegram",
      "1.0.0",
      0,
    );

    await up(db);

    const row = db
      .prepare("SELECT id, version, is_enabled, source, install_path, manifest_path FROM registered_plugins")
      .get() as Record<string, unknown>;

    assert.equal(row.id, "telegram");
    assert.equal(row.version, "1.0.0");
    assert.equal(row.is_enabled, 0);
    assert.equal(row.source, "internal");
    assert.equal(row.install_path, null);
    assert.equal(row.manifest_path, null);

    db.close();
  });
});
