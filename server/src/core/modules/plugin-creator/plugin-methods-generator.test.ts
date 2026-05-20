import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generatePluginMethodsSource } from "./plugin-methods-generator.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";

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
    auth: { type: "apiKey", fields: [] },
    methods: [
      {
        id: "method_create_lead",
        handle: "createLead",
        name: "Create Lead",
        description: "Create a CRM lead",
        inputs: [],
        request: {
          method: "POST",
          url: "https://api.example.com/leads",
          headers: [{ name: "Authorization", value: "Bearer {{ credentials.apiKey }}" }],
          query: [{ name: "source", value: "{{ params.source }}" }],
          body: { type: "json", value: { email: "{{ params.email }}" } },
        },
        responseMapping: [
          {
            id: "map_lead_id",
            outputName: "leadId",
            path: "body.data.id",
            type: "string",
            required: true,
          },
        ],
        errorMapping: [
          {
            id: "err_unauthorized",
            code: "INVALID_CREDENTIALS",
            condition: { source: "status", operator: "equals", value: 401 },
            message: { type: "static", value: "Credenciais invalidas" },
          },
        ],
      },
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

describe("generatePluginMethodsSource", () => {
  it("generates HTTP method handlers for GET and POST requests", () => {
    const source = generatePluginMethodsSource(createBlueprint());

    assert.match(source, /export const methods = \{/);
    assert.match(source, /createLead: async \(params: Record<string, unknown>, context: PluginContext = emptyContext\)/);
    assert.match(source, /getLead: async \(params: Record<string, unknown>, context: PluginContext = emptyContext\)/);
    assert.match(source, /method: "POST"/);
    assert.match(source, /method: "GET"/);
    assert.match(source, /body: rendered\.body === undefined \? undefined : JSON\.stringify\(rendered\.body\)/);
  });

  it("embeds response and error mappings as JSON data", () => {
    const source = generatePluginMethodsSource(createBlueprint());

    assert.match(source, /mapPluginCreatorResponse/);
    assert.match(source, /mapPluginCreatorError/);
    assert.match(source, /"outputName": "leadId"/);
    assert.match(source, /"code": "INVALID_CREDENTIALS"/);
  });

  it("escapes blueprint strings instead of emitting custom user code", () => {
    const blueprint = createBlueprint();
    blueprint.methods[0]!.request.url = 'https://api.example.com"; process.exit(1); "';

    const source = generatePluginMethodsSource(blueprint);

    assert.equal(source.includes('"; process.exit(1); ";\n'), false);
    assert.match(source, /https:\/\/api\.example\.com\\"; process\.exit\(1\); \\"/);
  });
});
