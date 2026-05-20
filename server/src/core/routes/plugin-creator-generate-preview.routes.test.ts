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

interface GeneratedPreviewResponse {
  files: Array<{
    relativePath: string;
    content: string;
  }>;
}

async function buildApp() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-preview-routes-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  const repository = new PluginBlueprintRepository(profilePaths);
  const engine = new PluginCreatorEngine({
    profilePaths,
    repository,
    scaffold: new PluginScaffoldService({
      createId: (prefix) => `${prefix}_fixed`,
      now: () => "2026-05-20T00:00:00.000Z",
    }),
  });
  const app = Fastify({ logger: false });
  await app.register(pluginCreatorRoutes, { engine });
  return { app, engine };
}

describe("plugin creator generate-preview route", () => {
  it("generates plugin files and returns safe preview content", async () => {
    const { app, engine } = await buildApp();
    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
      includeDefaultMethod: true,
    });
    const method = created.methods[0]!;
    const updated: PluginBlueprint = {
      ...created,
      methods: [
        {
          ...method,
          request: {
            ...method.request,
            url: "https://api.example.com/leads",
          },
        },
      ],
    };
    engine.updateBlueprint(created.id, updated);

    const response = await app.inject({
      method: "POST",
      url: `/plugin-creator/blueprints/${created.id}/generate-preview`,
    });
    const body = response.json() as ApiResponse<GeneratedPreviewResponse>;

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      body.data?.files.map((file) => file.relativePath).sort(),
      [
        "README.md",
        "index.js",
        "index.ts",
        "manifest.json",
        "methods.js",
        "methods.ts",
        "package-lock.json",
        "package.json",
        "plugin-error-mapper.js",
        "plugin-error-mapper.ts",
        "plugin-generated-http-helpers.js",
        "plugin-generated-http-helpers.ts",
        "plugin-request-template.js",
        "plugin-request-template.ts",
        "plugin-response-mapper.js",
        "plugin-response-mapper.ts",
      ].sort(),
    );
    assert.match(body.data?.files.find((file) => file.relativePath === "manifest.json")?.content ?? "", /"x-created-by": "sailor-plugin-creator"/);
    assert.match(body.data?.files.find((file) => file.relativePath === "methods.ts")?.content ?? "", /export const methods = \{/);
    assert.equal(JSON.stringify(body).includes("C:\\Workspace"), false);
  });

  it("returns 404 when the blueprint does not exist", async () => {
    const { app } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/plugin-creator/blueprints/bp_missing/generate-preview",
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 404);
    assert.equal(body.error, "blueprint_not_found");
  });

  it("returns 400 when preview generation fails validation", async () => {
    const app = Fastify({ logger: false });
    const engine = {
      generatePreview() {
        throw new Error("Generated plugin manifest is invalid: metadata.id is required");
      },
    } as unknown as PluginCreatorEngine;
    await app.register(pluginCreatorRoutes, { engine });

    const response = await app.inject({
      method: "POST",
      url: "/plugin-creator/blueprints/bp_invalid/generate-preview",
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.match(body.error ?? "", /Generated plugin manifest is invalid/);
  });
});
