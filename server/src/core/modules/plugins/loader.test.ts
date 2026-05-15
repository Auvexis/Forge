import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { loadPlugins } from "./loader.ts";
import type { Nod8Plugin } from "../../../shared/models/plugin-types.ts";

function createRegistryDb(): Database.Database {
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

function writePlugin(root: string, id: string, version = "1.0.0"): string {
  const pluginDir = path.join(root, id);
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, "index.js"),
    `
      export default {
        id: ${JSON.stringify(id)},
        manifest: {
          metadata: {
            id: ${JSON.stringify(id)},
            name: ${JSON.stringify(id)},
            description: "Test plugin",
            icon: "plug",
            category: "test",
            author: "ND8",
            version: ${JSON.stringify(version)},
            repository: ""
          },
          methods: {
            ping: {
              metadata: { label: "Ping", description: "Ping" },
              parameters: { type: "object", properties: {} },
              responseSchema: { type: "object", properties: {} },
              ui: { component: "form" }
            }
          }
        },
        auth: { type: "none" },
        methods: { ping: async () => ({ ok: true }) }
      };
    `,
  );
  return pluginDir;
}

function pluginFromEntrypoint(entrypoint: string, pluginId = path.basename(path.dirname(entrypoint))): Nod8Plugin {
  const id = pluginId;
  return {
    id,
    manifest: {
      metadata: {
        id,
        name: id,
        description: "Test plugin",
        icon: "plug",
        category: "test",
        author: "ND8",
        version: "1.0.0",
        repository: "",
      },
      methods: {
        ping: {
          metadata: { label: "Ping", description: "Ping" },
          parameters: { type: "object", properties: {} },
          responseSchema: { type: "object", properties: {} },
          ui: { component: "form" },
        },
      },
    },
    auth: { type: "none" },
    methods: { ping: async () => ({ ok: true }) },
  };
}

function createManager() {
  const registered: Nod8Plugin[] = [];
  return {
    registered,
    manager: {
      registerPlugin(plugin: Nod8Plugin) {
        registered.push(plugin);
      },
    },
  };
}

describe("loadPlugins", () => {
  it("loads internal and external plugin sources into the registry", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-loader-"));
    const internalDir = path.join(temp, "internal");
    const externalDir = path.join(temp, "external");
    writePlugin(internalDir, "internal-one");
    writePlugin(externalDir, "external-one");
    const db = createRegistryDb();
    const { manager, registered } = createManager();

    const result = await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: externalDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      pluginImporter: async (entrypoint) => pluginFromEntrypoint(entrypoint),
    });

    assert.equal(result.loaded.internal, 1);
    assert.equal(result.loaded.external, 1);
    assert.deepEqual(registered.map((plugin) => plugin.id).sort(), ["external-one", "internal-one"]);

    const rows = db.prepare("SELECT id, source FROM registered_plugins ORDER BY id").all() as any[];
    assert.deepEqual(rows, [
      { id: "external-one", source: "external" },
      { id: "internal-one", source: "internal" },
    ]);
    db.close();
  });

  it("loads external plugins under install id when manifest id conflicts with internal plugin ids", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-loader-"));
    const internalDir = path.join(temp, "internal");
    const externalDir = path.join(temp, "external");
    writePlugin(internalDir, "same-plugin");
    writePlugin(externalDir, "same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const db = createRegistryDb();
    const { manager, registered } = createManager();

    const result = await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: externalDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      pluginImporter: async (entrypoint) => {
        if (entrypoint.includes("same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")) {
          return pluginFromEntrypoint(entrypoint, "same-plugin");
        }
        return pluginFromEntrypoint(entrypoint);
      },
    });

    assert.equal(result.loaded.internal, 1);
    assert.equal(result.loaded.external, 1);
    assert.equal(result.skippedConflicts, 0);
    assert.deepEqual(registered.map((plugin) => plugin.id).sort(), [
      "same-plugin",
      "same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ]);

    const row = db
      .prepare("SELECT id, plugin_id FROM registered_plugins WHERE id = ?")
      .get("same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") as any;
    assert.deepEqual(row, {
      id: "same-plugin-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      plugin_id: "same-plugin",
    });
    db.close();
  });

  it("does not throw when external plugin directory is missing or invalid", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nd8-loader-"));
    const internalDir = path.join(temp, "internal");
    const externalDir = path.join(temp, "missing-external");
    const invalidDir = path.join(temp, "invalid");
    fs.mkdirSync(path.join(invalidDir, "bad-plugin"), { recursive: true });
    fs.writeFileSync(path.join(invalidDir, "bad-plugin", "index.js"), "export default {};");
    const db = createRegistryDb();
    const { manager } = createManager();

    const missingResult = await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: externalDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      pluginImporter: async (entrypoint) => pluginFromEntrypoint(entrypoint),
    });
    const invalidResult = await loadPlugins({
      internalPluginsDir: internalDir,
      externalPluginsDir: invalidDir,
      registryDb: db,
      pluginManager: manager,
      logger: { info: () => {}, error: () => {}, warn: () => {} },
      pluginImporter: async () => {
        throw new Error("bad plugin");
      },
    });

    assert.equal(missingResult.failed, 0);
    assert.equal(invalidResult.failed, 1);
    db.close();
  });
});
