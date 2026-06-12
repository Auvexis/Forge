import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { up } from "./migrations/plugins/003_external_plugin_install_identity.ts";

describe("003_external_plugin_install_identity", () => {
  it("adds plugin_id and backfills existing plugin rows", async () => {
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
    db.prepare("INSERT INTO registered_plugins (id, version, source) VALUES (?, ?, ?)").run(
      "telegram",
      "1.0.0",
      "internal",
    );

    await up(db);

    const row = db.prepare("SELECT id, plugin_id FROM registered_plugins").get() as Record<string, string>;
    assert.deepEqual(row, { id: "telegram", plugin_id: "telegram" });
    db.close();
  });
});
