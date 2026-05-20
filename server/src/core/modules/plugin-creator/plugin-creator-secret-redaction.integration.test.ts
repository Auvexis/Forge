import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { resolveBlueprintPaths } from "./plugin-creator-paths.ts";
import { PluginTestRunner } from "./plugin-test-runner.ts";
import { PluginVersionService } from "./plugin-version-service.ts";

function createBlueprint(url: string): PluginBlueprint {
  return {
    id: "bp_secret",
    metadata: {
      handle: "secret-api",
      name: "Secret API",
      version: "0.1.0",
      description: "Secret API connector",
    },
    icons: {},
    auth: {
      type: "apiKey",
      fields: [
        {
          name: "apiKey",
          label: "API Key",
          target: "header",
          headerName: "Authorization",
          prefix: "Bearer",
        },
      ],
    },
    methods: [
      {
        id: "method_ping",
        handle: "ping",
        name: "Ping",
        description: "Ping API",
        inputs: [],
        request: {
          method: "GET",
          url,
          headers: [{ name: "Authorization", value: "Bearer {{ credentials.apiKey }}" }],
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

function startServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve({
        url: `http://127.0.0.1:${address.port}/ping`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

describe("plugin creator secret redaction", () => {
  it("does not leak test credentials into last-run, route result or snapshots", async () => {
    const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-secrets-"));
    const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
    const repository = new PluginBlueprintRepository(profilePaths);
    const versionService = new PluginVersionService({
      profilePaths,
      repository,
      createId: () => "snap_secret",
      now: () => "2026-05-20T00:00:00.000Z",
    });
    const server = await startServer();
    const blueprint = createBlueprint(server.url);
    repository.create(blueprint);

    try {
      const runner = new PluginTestRunner({
        repository,
        now: () => "2026-05-20T00:00:00.000Z",
      });
      const result = await runner.run({
        blueprintId: blueprint.id,
        methodId: "method_ping",
        request: blueprint.methods[0]!.request,
        params: {},
        credentials: { apiKey: "secret-token" },
      });
      versionService.createSnapshot(blueprint, "manual-save");

      const paths = resolveBlueprintPaths(profilePaths, blueprint.id);
      const lastRun = fs.readFileSync(paths.lastRunPath, "utf8");
      const routeResult = JSON.stringify(result);
      const snapshot = fs.readFileSync(path.join(paths.snapshotsDir, "snap_secret.json"), "utf8");

      assert.equal(lastRun.includes("secret-token"), false);
      assert.equal(routeResult.includes("secret-token"), false);
      assert.equal(snapshot.includes("secret-token"), false);
      assert.match(lastRun, /Bearer \*\*\*\*\*\*\*\*/);
    } finally {
      await server.close();
    }
  });
});
