import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Fastify from "fastify";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { resolveProfilePaths } from "../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "../modules/plugin-creator/plugin-blueprint-repository.ts";
import { PluginCreatorEngine } from "../modules/plugin-creator/plugin-creator-engine.ts";
import { PluginScaffoldService } from "../modules/plugin-creator/plugin-scaffold-service.ts";
import { PluginTestRunner } from "../modules/plugin-creator/plugin-test-runner.ts";
import type { PluginBlueprint, PluginCreatorLastRun } from "../modules/plugin-creator/plugin-blueprint-types.ts";
import pluginCreatorRoutes from "./plugin-creator.routes.ts";

function startServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

async function buildApp() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-creator-test-method-routes-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  const repository = new PluginBlueprintRepository(profilePaths);
  const engine = new PluginCreatorEngine({
    repository,
    scaffold: new PluginScaffoldService({
      createId: (prefix) => `${prefix}_fixed`,
      now: () => "2026-05-20T00:00:00.000Z",
    }),
    testRunner: new PluginTestRunner({
      now: () => "2026-05-20T00:00:00.000Z",
      repository,
    }),
  });
  const app = Fastify({ logger: false });
  await app.register(pluginCreatorRoutes, { engine });
  return { app, engine };
}

describe("plugin creator test-method route", () => {
  it("runs a blueprint method and returns a masked test result", async () => {
    const server = await startServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
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
            url: `${server.url}/ping`,
            headers: [{ name: "Authorization", value: "Bearer {{ credentials.apiKey }}" }],
          },
        },
      ],
    };
    engine.updateBlueprint(created.id, updated);

    try {
      const response = await app.inject({
        method: "POST",
        url: `/plugin-creator/blueprints/${created.id}/test-method`,
        payload: {
          methodId: method.id,
          params: {},
          credentials: { apiKey: "secret-token" },
        },
      });
      const body = response.json() as ApiResponse<PluginCreatorLastRun>;

      assert.equal(response.statusCode, 200);
      assert.equal(body.data?.status, 200);
      assert.deepEqual(body.data?.body, { ok: true });
      assert.equal(body.data?.request.headers.Authorization, "Bearer ********");
      assert.equal(JSON.stringify(body).includes("secret-token"), false);
    } finally {
      await server.close();
    }
  });

  it("runs the generated method plan so code blocks affect output", async () => {
    const server = await startServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ id: "lead_1" }));
    });
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
          request: { ...method.request, url: `${server.url}/lead` },
          responseMapping: [{ id: "map_id", outputName: "id", path: "body.id", type: "string" }],
          codeBlocks: [
            {
              id: "code_shape",
              name: "Shape",
              source: "return { shaped: previous.id };",
            },
          ],
        },
      ],
      canvas: {
        nodes: {
          node_method: {
            id: "node_method",
            type: "method",
            position: { x: 0, y: 0 },
            data: { methodId: method.id },
          },
          node_request: {
            id: "node_request",
            type: "request",
            position: { x: 240, y: 0 },
            data: { methodId: method.id },
          },
          node_map: {
            id: "node_map",
            type: "responseMapper",
            position: { x: 480, y: 0 },
            data: { methodId: method.id },
          },
          code_shape: {
            id: "code_shape",
            type: "codeBlock",
            position: { x: 720, y: 0 },
            data: { methodId: method.id, codeBlockId: "code_shape" },
          },
        },
        edges: [
          { id: "edge_method_request", source: "node_method", target: "node_request" },
          { id: "edge_request_map", source: "node_request", target: "node_map" },
          { id: "edge_map_code", source: "node_map", target: "code_shape" },
        ],
      },
    };
    engine.updateBlueprint(created.id, updated);

    try {
      const response = await app.inject({
        method: "POST",
        url: `/plugin-creator/blueprints/${created.id}/test-method`,
        payload: { methodId: method.id, params: {}, credentials: {} },
      });
      const body = response.json() as ApiResponse<PluginCreatorLastRun>;

      assert.equal(response.statusCode, 200);
      assert.deepEqual(body.data?.body, { shaped: "lead_1" });
      assert.equal(body.data?.trace?.some((event) => event.nodeId === "code_shape"), true);
    } finally {
      await server.close();
    }
  });

  it("returns 404 when the blueprint does not exist", async () => {
    const { app } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/plugin-creator/blueprints/bp_missing/test-method",
      payload: { methodId: "method_missing", params: {}, credentials: {} },
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 404);
    assert.equal(body.error, "blueprint_not_found");
  });

  it("returns 400 when the method does not exist", async () => {
    const { app, engine } = await buildApp();
    const created = engine.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
    });

    const response = await app.inject({
      method: "POST",
      url: `/plugin-creator/blueprints/${created.id}/test-method`,
      payload: { methodId: "method_missing", params: {}, credentials: {} },
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.equal(body.error, "method_not_found");
  });
});
