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
        id: "method_get_lead",
        handle: "getLead",
        name: "Get Lead",
        description: "Get a CRM lead",
        inputs: [],
        request: {
          method: "GET",
          url: "https://api.example.com/leads/{{ params.leadId }}",
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

describe("PluginPublishService installer integration", () => {
  it("installs a published release into the current profile and reloads registry", () => {
    const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-publish-install-"));
    const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
    fs.mkdirSync(path.join(sailorHome, "profiles", "team"), { recursive: true });
    const repository = new PluginBlueprintRepository(profilePaths);
    const versionService = new PluginVersionService({
      profilePaths,
      repository,
      createId: () => "snap_publish_install",
      now: () => "2026-05-20T00:00:00.000Z",
    });
    const service = new PluginPublishService({
      profilePaths,
      repository,
      versionService,
      now: () => "2026-05-20T01:00:00.000Z",
    });
    const registryDb = createDb();
    repository.create(createBlueprint());

    const result = service.installPublishedRelease("bp_my_crm", {
      currentProfileId: "default",
      registryDb,
      installerPaths: {
        globalPluginsDir: path.join(sailorHome, "global", "plugins"),
        pluginCacheDir: path.join(sailorHome, "global", "plugin-cache"),
        logsDir: path.join(sailorHome, "global", "logs"),
        profilesDir: path.join(sailorHome, "profiles"),
        defaultProfileDir: path.join(sailorHome, "profiles", "default"),
      },
      installIdGenerator: () => "my-crm-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      dependencyInstaller: () => {},
      runtimeReload: () => ({ status: "loaded" }),
    });

    assert.equal(result.installId, "my-crm-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(result.pluginId, "my-crm");
    assert.equal(result.reloadStatus, "loaded");
    assert.equal(fs.existsSync(path.join(result.installPath, "manifest.json")), true);
    assert.match(
      fs.readFileSync(path.join(sailorHome, "profiles", "default", "plugin-settings.json"), "utf8"),
      /my-crm-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/,
    );
    assert.equal(fs.existsSync(path.join(sailorHome, "profiles", "team", "plugin-settings.json")), false);

    const row = registryDb.prepare("SELECT id, plugin_id, source FROM registered_plugins").get() as any;
    assert.deepEqual(row, {
      id: "my-crm-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      plugin_id: "my-crm",
      source: "external",
    });
    registryDb.close();
  });
});
