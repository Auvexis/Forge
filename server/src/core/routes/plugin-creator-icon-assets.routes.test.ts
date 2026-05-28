import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import multipart from "@fastify/multipart";
import Fastify from "fastify";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { resolveProfilePaths } from "../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "../modules/plugin-creator/plugin-blueprint-repository.ts";
import { PluginCreatorEngine } from "../modules/plugin-creator/plugin-creator-engine.ts";
import { PluginScaffoldService } from "../modules/plugin-creator/plugin-scaffold-service.ts";
import type { PluginBlueprint } from "../modules/plugin-creator/plugin-blueprint-types.ts";
import pluginCreatorRoutes from "./plugin-creator.routes.ts";

async function buildApp() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-icon-route-"));
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
  await app.register(multipart);
  await app.register(pluginCreatorRoutes, { engine });
  const blueprint = engine.createBlueprint({
    handle: "my-crm",
    name: "My CRM",
    description: "CRM API connector",
  });
  return { app, profilePaths, blueprint };
}

describe("plugin creator icon asset upload route", () => {
  it("uploads an icon asset, updates the blueprint icon slot and returns the blueprint", async () => {
    const { app, profilePaths, blueprint } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: `/plugin-creator/blueprints/${blueprint.id}/assets/icons/iconLight`,
      ...multipartPayload("logo.svg", "<svg>light</svg>"),
    });
    const body = response.json() as ApiResponse<PluginBlueprint>;

    assert.equal(response.statusCode, 200);
    assert.equal(body.data?.icons.iconLight, "assets/icons/iconLight.svg");
    assert.equal(
      fs.readFileSync(
        path.join(
          profilePaths.profileDir,
          "plugin-creator",
          "blueprints",
          blueprint.id,
          "assets",
          "icons",
          "iconLight.svg",
        ),
        "utf8",
      ),
      "<svg>light</svg>",
    );
  });

  it("rejects an invalid icon slot", async () => {
    const { app, blueprint } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: `/plugin-creator/blueprints/${blueprint.id}/assets/icons/notIcon`,
      ...multipartPayload("logo.svg", "<svg />"),
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.equal(body.error, "invalid_icon_slot");
  });

  it("rejects unsupported icon file extensions", async () => {
    const { app, blueprint } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: `/plugin-creator/blueprints/${blueprint.id}/assets/icons/icon`,
      ...multipartPayload("logo.txt", "nope"),
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.match(body.error ?? "", /Invalid plugin icon asset/);
  });

  it("requires a multipart file", async () => {
    const { app, blueprint } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: `/plugin-creator/blueprints/${blueprint.id}/assets/icons/icon`,
      headers: { "content-type": "multipart/form-data; boundary=----empty" },
      payload: "------empty--\r\n",
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.equal(body.error, "file_required");
  });
});

function multipartPayload(filename: string, content: string) {
  const boundary = "----sailor-icon-test-boundary";
  const body = Buffer.from(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      "Content-Type: image/svg+xml",
      "",
      content,
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  );

  return {
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    payload: body,
  };
}
