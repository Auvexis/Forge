import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { PluginPublishService } from "./plugin-publish-service.ts";
import { PluginVersionService } from "./plugin-version-service.ts";

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

function createBlueprint(): PluginBlueprint {
  return {
    id: "bp_my_crm",
    metadata: {
      handle: "my-crm",
      name: "My CRM",
      version: "0.1.0",
      description: "CRM API connector",
    },
    icons: {},
    auth: { type: "none", fields: [] },
    methods: [
      {
        id: "method_ping",
        handle: "ping",
        name: "Ping",
        description: "Ping API",
        inputs: [],
        request: {
          method: "GET",
          url: "https://api.example.com/ping",
          headers: [],
          query: [],
          body: { type: "none" },
        },
        responseMapping: [],
        errorMapping: [],
      },
    ],
    canvas: { nodes: {}, edges: [] },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
}

describe("plugin creator profile scope", () => {
  it("keeps blueprints and installs scoped to the selected profile", () => {
    const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-scope-"));
    const profileA = resolveProfilePaths({ sailorHome, profileId: "profile-a" });
    const profileB = resolveProfilePaths({ sailorHome, profileId: "profile-b" });
    fs.mkdirSync(profileA.profileDir, { recursive: true });
    fs.mkdirSync(profileB.profileDir, { recursive: true });

    const repositoryA = new PluginBlueprintRepository(profileA);
    const repositoryB = new PluginBlueprintRepository(profileB);
    const versionServiceA = new PluginVersionService({
      profilePaths: profileA,
      repository: repositoryA,
      createId: () => "snap_scope",
      now: () => "2026-05-20T00:00:00.000Z",
    });
    const publishA = new PluginPublishService({
      profilePaths: profileA,
      repository: repositoryA,
      versionService: versionServiceA,
      now: () => "2026-05-20T01:00:00.000Z",
    });
    const registryDb = createDb();
    repositoryA.create(createBlueprint());

    publishA.publish("bp_my_crm");

    assert.deepEqual(repositoryA.list().map((blueprint) => blueprint.id), ["bp_my_crm"]);
    assert.deepEqual(repositoryB.list(), []);
    assert.equal(fs.existsSync(path.join(profileB.profileDir, "plugin-settings.json")), false);

    const installedInB = publishA.installPublishedRelease("bp_my_crm", {
      currentProfileId: "profile-b",
      registryDb,
      installerPaths: {
        globalPluginsDir: path.join(sailorHome, "global", "plugins"),
        pluginCacheDir: path.join(sailorHome, "global", "plugin-cache"),
        logsDir: path.join(sailorHome, "global", "logs"),
        profilesDir: path.join(sailorHome, "profiles"),
        defaultProfileDir: profileA.profileDir,
      },
      installIdGenerator: () => "my-crm-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      dependencyInstaller: () => {},
      runtimeReload: () => ({ status: "loaded" }),
    });

    assert.equal(installedInB.reloadStatus, "loaded");
    assert.equal(fs.existsSync(path.join(profileB.profileDir, "plugin-settings.json")), true);
    assert.match(
      fs.readFileSync(path.join(profileB.profileDir, "plugin-settings.json"), "utf8"),
      /my-crm-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/,
    );
    assert.equal(fs.existsSync(path.join(profileA.profileDir, "plugin-settings.json")), false);

    registryDb.close();
  });
});
