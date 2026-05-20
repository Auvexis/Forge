import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { PluginExportService } from "./plugin-export-service.ts";
import { PluginPublishService } from "./plugin-publish-service.ts";
import { PluginVersionService } from "./plugin-version-service.ts";

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

function createHarness() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-export-service-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  const repository = new PluginBlueprintRepository(profilePaths);
  const versionService = new PluginVersionService({
    profilePaths,
    repository,
    createId: () => "snap_export",
    now: () => "2026-05-20T00:00:00.000Z",
  });
  const publishService = new PluginPublishService({
    profilePaths,
    repository,
    versionService,
    now: () => "2026-05-20T01:00:00.000Z",
  });
  const service = new PluginExportService({ profilePaths });
  repository.create(createBlueprint());
  const release = publishService.publish("bp_my_crm");
  return { sailorHome, profilePaths, service, release };
}

describe("PluginExportService", () => {
  it("exports a published release as a ZIP file", () => {
    const { profilePaths, service } = createHarness();

    const result = service.exportZip("bp_my_crm", "0.1.0");
    const zip = fs.readFileSync(result.zipPath);

    assert.equal(result.zipPath, path.join(profilePaths.profileDir, "plugin-creator", "exports", "0.1.0.zip"));
    assert.equal(zip.subarray(0, 2).toString("utf8"), "PK");
    assert.equal(zip.includes(Buffer.from("manifest.json")), true);
    assert.equal(zip.includes(Buffer.from("methods.js")), true);
  });

  it("exports a release folder to an allowed local path", () => {
    const { sailorHome, service } = createHarness();
    const destination = path.join(sailorHome, "exports", "my-crm");

    const result = service.exportFolder("bp_my_crm", "0.1.0", destination);

    assert.equal(result.destinationDir, destination);
    assert.equal(fs.existsSync(path.join(destination, "manifest.json")), true);
    assert.equal(fs.existsSync(path.join(destination, "index.js")), true);
  });

  it("blocks traversal in ids, versions and relative destinations", () => {
    const { sailorHome, service } = createHarness();

    assert.throws(() => service.exportZip("../evil", "0.1.0"), /Invalid plugin creator id/);
    assert.throws(() => service.exportZip("bp_my_crm", "../0.1.0"), /Invalid plugin creator version/);
    assert.throws(
      () => service.exportFolder("bp_my_crm", "0.1.0", `${sailorHome}${path.sep}exports${path.sep}..${path.sep}..${path.sep}evil`),
      /Export destination must stay inside its parent directory/,
    );
  });

  it("does not overwrite existing custom destination files", () => {
    const { sailorHome, service } = createHarness();
    const destination = path.join(sailorHome, "exports", "custom");
    fs.mkdirSync(destination, { recursive: true });
    fs.writeFileSync(path.join(destination, "methods.js"), "// custom code\n", "utf8");

    assert.throws(() => service.exportFolder("bp_my_crm", "0.1.0", destination), /export_destination_exists/);
    assert.equal(fs.readFileSync(path.join(destination, "methods.js"), "utf8"), "// custom code\n");
  });
});
