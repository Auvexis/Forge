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
import { PluginExportService } from "../modules/plugin-creator/plugin-export-service.ts";
import { PluginPublishService } from "../modules/plugin-creator/plugin-publish-service.ts";
import { PluginScaffoldService } from "../modules/plugin-creator/plugin-scaffold-service.ts";
import { PluginVersionService } from "../modules/plugin-creator/plugin-version-service.ts";
import pluginCreatorRoutes from "./plugin-creator.routes.ts";

async function buildApp() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-export-routes-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  const repository = new PluginBlueprintRepository(profilePaths);
  const versionService = new PluginVersionService({
    profilePaths,
    repository,
    createId: () => "snap_export_route",
    now: () => "2026-05-20T00:00:00.000Z",
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
    exportService: new PluginExportService({ profilePaths }),
    scaffold: new PluginScaffoldService({
      createId: (prefix) => `${prefix}_fixed`,
      now: () => "2026-05-20T00:00:00.000Z",
    }),
  });
  const app = Fastify({ logger: false });
  await app.register(pluginCreatorRoutes, { engine });
  return { app, engine };
}

describe("plugin creator export route", () => {
  it("returns a published release ZIP", async () => {
    const { app, engine } = await buildApp();
    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
      includeDefaultMethod: true,
    });
    engine.publish(created.id);

    const response = await app.inject({
      method: "GET",
      url: `/plugin-creator/blueprints/${created.id}/export.zip`,
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] as string, /application\/zip/);
    assert.equal(response.rawPayload.subarray(0, 2).toString("utf8"), "PK");
  });

  it("returns an error when the release does not exist", async () => {
    const { app, engine } = await buildApp();
    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
    });

    const response = await app.inject({
      method: "GET",
      url: `/plugin-creator/blueprints/${created.id}/export.zip`,
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.equal(body.error, "release_not_found");
  });
});
