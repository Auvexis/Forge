import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { resolveBlueprintPaths } from "./plugin-creator-paths.ts";
import { PluginPublishService } from "./plugin-publish-service.ts";
import { PluginVersionService } from "./plugin-version-service.ts";

function createBlueprint(version = "0.1.0"): PluginBlueprint {
  return {
    id: "bp_my_crm",
    metadata: {
      handle: "my-crm",
      name: "My CRM",
      version,
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

function createHarness() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-publish-service-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  const repository = new PluginBlueprintRepository(profilePaths);
  let snapshotCount = 0;
  const versionService = new PluginVersionService({
    profilePaths,
    repository,
    createId: () => `snap_publish_${++snapshotCount}`,
    now: () => "2026-05-20T00:00:00.000Z",
  });
  return {
    profilePaths,
    repository,
    versionService,
    service: new PluginPublishService({
      profilePaths,
      repository,
      versionService,
      now: () => "2026-05-20T01:00:00.000Z",
    }),
  };
}

describe("PluginPublishService", () => {
  it("validates, snapshots, generates and copies a fixed release", () => {
    const { profilePaths, repository, service, versionService } = createHarness();
    const blueprint = createBlueprint("0.1.0");
    repository.create(blueprint);

    const release = service.publish(blueprint.id);
    const paths = resolveBlueprintPaths(profilePaths, blueprint.id);

    assert.equal(release.blueprintId, blueprint.id);
    assert.equal(release.version, "0.1.0");
    assert.equal(release.releaseDir, paths.releaseDir("0.1.0"));
    assert.equal(fs.existsSync(path.join(paths.generatedDir, "manifest.json")), true);
    assert.equal(fs.existsSync(path.join(release.releaseDir, "manifest.json")), true);
    assert.equal(fs.existsSync(path.join(release.releaseDir, "methods.ts")), true);
    assert.equal(versionService.listSnapshots(blueprint.id).some((snapshot) => snapshot.reason === "pre-publish"), true);

    const manifest = JSON.parse(fs.readFileSync(path.join(release.releaseDir, "manifest.json"), "utf8"));
    assert.equal(manifest["x-editable-low-code"], true);
  });

  it("does not mutate an existing release when publishing a newer version", () => {
    const { repository, service } = createHarness();
    repository.create(createBlueprint("0.1.0"));
    const firstRelease = service.publish("bp_my_crm");
    const firstManifestPath = path.join(firstRelease.releaseDir, "manifest.json");
    const firstManifestBefore = fs.readFileSync(firstManifestPath, "utf8");

    repository.update("bp_my_crm", createBlueprint("0.2.0"));
    const secondRelease = service.publish("bp_my_crm");

    assert.notEqual(firstRelease.releaseDir, secondRelease.releaseDir);
    assert.equal(fs.readFileSync(firstManifestPath, "utf8"), firstManifestBefore);
    assert.equal(JSON.parse(fs.readFileSync(path.join(secondRelease.releaseDir, "manifest.json"), "utf8")).metadata.version, "0.2.0");
  });

  it("rejects invalid blueprints before creating a release", () => {
    const { service } = createHarness();

    assert.throws(() => service.publish("bp_missing"), /blueprint_not_found/);
  });

  it("blocks overwriting a custom release unless explicitly allowed", () => {
    const { profilePaths, repository, service } = createHarness();
    const blueprint = createBlueprint("0.1.0");
    repository.create(blueprint);
    const releaseDir = resolveBlueprintPaths(profilePaths, blueprint.id).releaseDir("0.1.0");
    fs.mkdirSync(releaseDir, { recursive: true });
    fs.writeFileSync(path.join(releaseDir, "methods.ts"), "// custom code\n", "utf8");

    assert.throws(() => service.publish(blueprint.id), /custom_release_exists/);

    const release = service.publish(blueprint.id, { allowOverwriteCustom: true });
    assert.equal(fs.existsSync(path.join(release.releaseDir, "manifest.json")), true);
  });
});
