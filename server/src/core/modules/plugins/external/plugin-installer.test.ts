import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { installExternalPlugin } from "./plugin-installer.ts";

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

function writeRelease(root: string): string {
  const releaseDir = path.join(root, "release");
  fs.mkdirSync(releaseDir, { recursive: true });
  const manifest = {
    metadata: {
      id: "github-tools",
      name: "Github Tools",
      description: "Tools",
      icon: "plug",
      category: "dev",
      author: "SAILOR",
      version: "1.0.0",
      repository: "https://github.com/acme/github-tools",
    },
    methods: {
      ping: {
        metadata: { label: "Ping", description: "Ping" },
        parameters: { type: "object", properties: {} },
        responseSchema: { type: "object", properties: {} },
      },
    },
  };
  fs.writeFileSync(path.join(releaseDir, "manifest.json"), JSON.stringify(manifest));
  fs.writeFileSync(path.join(releaseDir, "index.js"), "export default {};");
  fs.writeFileSync(path.join(releaseDir, "methods.js"), "export default {};");
  fs.writeFileSync(path.join(releaseDir, "package.json"), JSON.stringify({ name: "github-tools" }));
  fs.writeFileSync(path.join(releaseDir, "package-lock.json"), JSON.stringify({ lockfileVersion: 3 }));
  return releaseDir;
}

describe("installExternalPlugin", () => {
  it("installs release into an installId folder, registers it and enables profile scope", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-install-"));
    const sourceRoot = path.join(home, "source");
    const releaseDir = writeRelease(sourceRoot);
    const db = createDb();
    const dependencyCalls: string[] = [];

    const result = installExternalPlugin({
      releaseDir,
      source: { type: "extracted_folder", originalValue: sourceRoot, cachedAt: new Date().toISOString() },
      scope: "current_profile",
      currentProfileId: "work",
      paths: {
        globalPluginsDir: path.join(home, "global", "plugins"),
        pluginCacheDir: path.join(home, "global", "plugin-cache"),
        logsDir: path.join(home, "global", "logs"),
        profilesDir: path.join(home, "profiles"),
        defaultProfileDir: path.join(home, "profiles", "default"),
      },
      registryDb: db,
      installIdGenerator: () => "github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      dependencyInstaller: (pluginDir) => dependencyCalls.push(pluginDir),
      runtimeReload: () => ({ status: "loaded" }),
    });

    assert.equal(result.installId, "github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.pluginId, "github-tools");
    assert.equal(result.reloadStatus, "loaded");
    assert.equal(fs.existsSync(path.join(result.installPath, "manifest.json")), true);
    assert.deepEqual(dependencyCalls, [path.join(home, "global", "plugin-cache", "staging", result.installId)]);

    const row = db.prepare("SELECT id, plugin_id, source FROM registered_plugins").get() as any;
    assert.deepEqual(row, {
      id: "github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      plugin_id: "github-tools",
      source: "external",
    });
    assert.match(
      fs.readFileSync(path.join(home, "profiles", "work", "plugin-settings.json"), "utf8"),
      /github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/,
    );
    assert.equal(fs.existsSync(path.join(home, "profiles", "default", "plugin-settings.json")), false);
    db.close();
  });

  it("enables a selected profile without enabling the current profile", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-install-"));
    const sourceRoot = path.join(home, "source");
    const releaseDir = writeRelease(sourceRoot);
    const db = createDb();
    fs.mkdirSync(path.join(home, "profiles", "default"), { recursive: true });
    fs.mkdirSync(path.join(home, "profiles", "team"), { recursive: true });

    const result = installExternalPlugin({
      releaseDir,
      source: { type: "extracted_folder", originalValue: sourceRoot, cachedAt: new Date().toISOString() },
      scope: "selected_profile",
      currentProfileId: "default",
      selectedProfileId: "team",
      paths: {
        globalPluginsDir: path.join(home, "global", "plugins"),
        pluginCacheDir: path.join(home, "global", "plugin-cache"),
        logsDir: path.join(home, "global", "logs"),
        profilesDir: path.join(home, "profiles"),
        defaultProfileDir: path.join(home, "profiles", "default"),
      },
      registryDb: db,
      installIdGenerator: () => "github-tools-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      dependencyInstaller: () => {},
      runtimeReload: () => ({ status: "loaded" }),
    });

    assert.equal(result.profileId, "team");
    assert.match(
      fs.readFileSync(path.join(home, "profiles", "team", "plugin-settings.json"), "utf8"),
      /github-tools-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/,
    );
    assert.equal(fs.existsSync(path.join(home, "profiles", "default", "plugin-settings.json")), false);
    db.close();
  });

  it("cleans staging when dependency installation fails", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-install-"));
    const sourceRoot = path.join(home, "source");
    const releaseDir = writeRelease(sourceRoot);
    const db = createDb();

    assert.throws(
      () =>
        installExternalPlugin({
          releaseDir,
          source: { type: "extracted_folder", originalValue: sourceRoot, cachedAt: new Date().toISOString() },
          scope: "current_profile",
          paths: {
            globalPluginsDir: path.join(home, "global", "plugins"),
            pluginCacheDir: path.join(home, "global", "plugin-cache"),
            logsDir: path.join(home, "global", "logs"),
            profilesDir: path.join(home, "profiles"),
            defaultProfileDir: path.join(home, "profiles", "default"),
          },
          registryDb: db,
          installIdGenerator: () => "github-tools-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          dependencyInstaller: () => {
            throw new Error("npm failed");
          },
        }),
      /npm failed/,
    );
    assert.equal(fs.existsSync(path.join(home, "global", "plugin-cache", "staging")), false);
    db.close();
  });
});
