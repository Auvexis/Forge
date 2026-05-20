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
import type { PluginBlueprint } from "../modules/plugin-creator/plugin-blueprint-types.ts";
import pluginCreatorRoutes from "./plugin-creator.routes.ts";

async function buildApp() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-routes-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  const engine = new PluginCreatorEngine({
    repository: new PluginBlueprintRepository(profilePaths),
    scaffold: new PluginScaffoldService({
      createId: (prefix) => `${prefix}_fixed`,
      now: () => "2026-05-20T00:00:00.000Z",
    }),
  });
  const app = Fastify({ logger: false });
  await app.register(pluginCreatorRoutes, { engine });
  return app;
}

describe("plugin creator routes", () => {
  it("creates, lists, reads and updates blueprints", async () => {
    const app = await buildApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/plugin-creator/blueprints",
      payload: {
        handle: "my-crm",
        name: "My CRM",
        description: "CRM API connector",
      },
    });
    const createBody = createResponse.json() as ApiResponse<PluginBlueprint>;
    assert.equal(createResponse.statusCode, 201);
    assert.equal(createBody.data?.id, "bp_fixed");

    const listResponse = await app.inject({ method: "GET", url: "/plugin-creator/blueprints" });
    const listBody = listResponse.json() as ApiResponse<PluginBlueprint[]>;
    assert.equal(listResponse.statusCode, 200);
    assert.deepEqual(listBody.data?.map((blueprint) => blueprint.id), ["bp_fixed"]);

    const getResponse = await app.inject({ method: "GET", url: "/plugin-creator/blueprints/bp_fixed" });
    const getBody = getResponse.json() as ApiResponse<PluginBlueprint>;
    assert.equal(getResponse.statusCode, 200);
    assert.equal(getBody.data?.metadata.name, "My CRM");

    const updated = {
      ...getBody.data!,
      metadata: { ...getBody.data!.metadata, name: "Updated CRM" },
      updatedAt: "2026-05-20T01:00:00.000Z",
    };
    const updateResponse = await app.inject({
      method: "PUT",
      url: "/plugin-creator/blueprints/bp_fixed",
      payload: updated,
    });
    const updateBody = updateResponse.json() as ApiResponse<PluginBlueprint>;
    assert.equal(updateResponse.statusCode, 200);
    assert.equal(updateBody.data?.metadata.name, "Updated CRM");
  });

  it("returns 400 for invalid create payloads", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/plugin-creator/blueprints",
      payload: { handle: "bad handle", name: "", description: "" },
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.match(body.error ?? "", /handle/);
  });

  it("returns 404 for missing blueprints", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/plugin-creator/blueprints/bp_missing" });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 404);
    assert.equal(body.error, "blueprint_not_found");
  });
});
