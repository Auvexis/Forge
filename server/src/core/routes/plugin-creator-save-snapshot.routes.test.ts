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
import { PluginScaffoldService } from "../modules/plugin-creator/plugin-scaffold-service.ts";
import { PluginVersionService } from "../modules/plugin-creator/plugin-version-service.ts";
import type { PluginBlueprint } from "../modules/plugin-creator/plugin-blueprint-types.ts";
import pluginCreatorRoutes from "./plugin-creator.routes.ts";

async function buildApp() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-save-snapshot-routes-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  const repository = new PluginBlueprintRepository(profilePaths);
  const versionService = new PluginVersionService({
    profilePaths,
    repository,
    createId: () => "snap_manual_save",
    now: () => "2026-05-20T01:00:00.000Z",
  });
  const engine = new PluginCreatorEngine({
    profilePaths,
    repository,
    versionService,
    scaffold: new PluginScaffoldService({
      createId: (prefix) => `${prefix}_fixed`,
      now: () => "2026-05-20T00:00:00.000Z",
    }),
  });
  const app = Fastify({ logger: false });
  await app.register(pluginCreatorRoutes, { engine });
  return { app, engine, versionService };
}

describe("plugin creator save snapshots", () => {
  it("creates a manual-save snapshot when a blueprint is updated", async () => {
    const { app, engine, versionService } = await buildApp();
    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
    });
    const updated: PluginBlueprint = {
      ...created,
      metadata: { ...created.metadata, name: "My CRM Draft" },
      updatedAt: "2026-05-20T01:00:00.000Z",
    };

    const response = await app.inject({
      method: "PUT",
      url: `/plugin-creator/blueprints/${created.id}`,
      payload: updated,
    });
    const body = response.json() as ApiResponse<PluginBlueprint>;
    const snapshots = versionService.listSnapshots(created.id);

    assert.equal(response.statusCode, 200);
    assert.equal(body.data?.metadata.name, "My CRM Draft");
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0]?.reason, "manual-save");
    assert.equal(snapshots[0]?.blueprint.metadata.name, "My CRM Draft");
  });
});
