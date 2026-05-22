import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import type { PluginBlueprint } from "../modules/plugin-creator/plugin-blueprint-types.ts";
import pluginCreatorRoutes from "./plugin-creator.routes.ts";

interface CodePreviewResponse {
  files: Array<{
    relativePath: string;
    content: string;
  }>;
}

function createValidBlueprint(): PluginBlueprint {
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
        id: "method_create_lead",
        handle: "createLead",
        name: "Create Lead",
        description: "Create a lead",
        inputs: [],
        request: {
          method: "POST",
          url: "https://api.example.com/leads",
          headers: [],
          query: [],
          body: { type: "json", value: {} },
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

describe("plugin creator draft code preview route", () => {
  it("generates methods source from an unsaved blueprint draft", async () => {
    const app = Fastify({ logger: false });
    await app.register(pluginCreatorRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/plugin-creator/blueprints/preview-code",
      payload: { blueprint: createValidBlueprint() },
    });
    const body = response.json() as ApiResponse<CodePreviewResponse>;

    assert.equal(response.statusCode, 200);
    assert.equal(body.data?.files[0]?.relativePath, "methods.ts");
    assert.match(body.data?.files[0]?.content ?? "", /export const methods = \{/);
  });

  it("rejects invalid draft blueprints", async () => {
    const app = Fastify({ logger: false });
    await app.register(pluginCreatorRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/plugin-creator/blueprints/preview-code",
      payload: { blueprint: { id: "../bad" } },
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.match(body.error ?? "", /Invalid/);
  });
});
