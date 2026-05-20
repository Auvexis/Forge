import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Fastify from "fastify";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { resolveProfilePaths } from "../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "../modules/plugin-creator/plugin-blueprint-repository.ts";
import { PluginCreatorEngine } from "../modules/plugin-creator/plugin-creator-engine.ts";
import { PluginPublishService } from "../modules/plugin-creator/plugin-publish-service.ts";
import { PluginScaffoldService } from "../modules/plugin-creator/plugin-scaffold-service.ts";
import { PluginVersionService } from "../modules/plugin-creator/plugin-version-service.ts";
import type { PluginBlueprint, PluginCreatorRelease, PluginCreatorSnapshot } from "../modules/plugin-creator/plugin-blueprint-types.ts";
import pluginCreatorRoutes from "./plugin-creator.routes.ts";

async function buildApp() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-versioning-routes-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  const repository = new PluginBlueprintRepository(profilePaths);
  let snapshotCount = 0;
  const versionService = new PluginVersionService({
    profilePaths,
    repository,
    createId: () => `snap_route_${++snapshotCount}`,
    now: () => `2026-05-20T00:0${snapshotCount}:00.000Z`,
  });
  const publishService = new PluginPublishService({
    profilePaths,
    repository,
    versionService,
    now: () => "2026-05-20T01:00:00.000Z",
  });
  const engine = new PluginCreatorEngine({
    profilePaths,
    repository,
    versionService,
    publishService,
    scaffold: new PluginScaffoldService({
      createId: (prefix) => `${prefix}_fixed`,
      now: () => "2026-05-20T00:00:00.000Z",
    }),
  });
  const app = Fastify({ logger: false });
  await app.register(pluginCreatorRoutes, { engine });
  return { app, engine, versionService };
}

describe("plugin creator versioning routes", () => {
  it("lists versions, rolls back snapshots and publishes releases", async () => {
    const { app, engine, versionService } = await buildApp();
    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
      includeDefaultMethod: true,
    });
    const snapshot = versionService.createSnapshot(created, "manual-save");
    const broken: PluginBlueprint = {
      ...created,
      metadata: { ...created.metadata, name: "Broken Draft" },
      updatedAt: "2026-05-20T01:00:00.000Z",
    };
    engine.updateBlueprint(created.id, broken);

    const versionsResponse = await app.inject({
      method: "GET",
      url: `/plugin-creator/blueprints/${created.id}/versions`,
    });
    const versionsBody = versionsResponse.json() as ApiResponse<{ snapshots: PluginCreatorSnapshot[] }>;
    assert.equal(versionsResponse.statusCode, 200);
    assert.equal(versionsBody.data?.snapshots.some((item) => item.id === snapshot.id), true);

    const rollbackResponse = await app.inject({
      method: "POST",
      url: `/plugin-creator/blueprints/${created.id}/rollback`,
      payload: { snapshotId: snapshot.id },
    });
    const rollbackBody = rollbackResponse.json() as ApiResponse<PluginBlueprint>;
    assert.equal(rollbackResponse.statusCode, 200);
    assert.equal(rollbackBody.data?.metadata.name, "My CRM");

    const publishResponse = await app.inject({
      method: "POST",
      url: `/plugin-creator/blueprints/${created.id}/publish`,
    });
    const publishBody = publishResponse.json() as ApiResponse<PluginCreatorRelease>;
    assert.equal(publishResponse.statusCode, 200);
    assert.equal(publishBody.data?.version, "0.1.0");
    assert.equal(fs.existsSync(path.join(publishBody.data!.releaseDir, "manifest.json")), true);
  });

  it("returns 404 for missing blueprints", async () => {
    const { app } = await buildApp();

    for (const request of [
      { method: "GET", url: "/plugin-creator/blueprints/bp_missing/versions" },
      { method: "POST", url: "/plugin-creator/blueprints/bp_missing/publish" },
    ] as const) {
      const response = await app.inject(request);
      const body = response.json() as ApiResponse<null>;
      assert.equal(response.statusCode, 404);
      assert.equal(body.error, "blueprint_not_found");
    }
  });

  it("returns 400 for missing rollback snapshots", async () => {
    const { app, engine } = await buildApp();
    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
    });

    const response = await app.inject({
      method: "POST",
      url: `/plugin-creator/blueprints/${created.id}/rollback`,
      payload: { snapshotId: "snap_missing" },
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.equal(body.error, "snapshot_not_found");
  });
});
