import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { generatePluginMethodsSource } from "./plugin-methods-generator.ts";

function createBlueprintWithRequestMapperAndCodeBlock(): PluginBlueprint {
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
          body: { type: "json", value: { name: "{{ params.name }}" } },
        },
        responseMapping: [{ id: "map_lead", outputName: "lead", path: "body", type: "object" }],
        errorMapping: [],
        codeBlocks: [{ id: "code_after_map", name: "After map", source: "return previous;" }],
      },
    ],
    canvas: {
      nodes: {
        method_create_lead: {
          id: "method_create_lead",
          type: "method",
          position: { x: 0, y: 0 },
          data: { methodId: "method_create_lead" },
        },
        request_create_lead: {
          id: "request_create_lead",
          type: "request",
          position: { x: 240, y: 0 },
          data: { methodId: "method_create_lead" },
        },
        map_create_lead: {
          id: "map_create_lead",
          type: "responseMapper",
          position: { x: 480, y: 0 },
          data: { methodId: "method_create_lead" },
        },
        code_after_map: {
          id: "code_after_map",
          type: "codeBlock",
          position: { x: 720, y: 0 },
          data: { methodId: "method_create_lead", codeBlockId: "code_after_map" },
        },
      },
      edges: [
        { id: "edge_1", source: "method_create_lead", target: "request_create_lead" },
        { id: "edge_2", source: "request_create_lead", target: "map_create_lead" },
        { id: "edge_3", source: "map_create_lead", target: "code_after_map" },
      ],
    },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
}

describe("plugin method code writer", () => {
  it("emits method source as ordered node statements", () => {
    const source = generatePluginMethodsSource(createBlueprintWithRequestMapperAndCodeBlock());

    assert.match(source, /\/\/ Node HTTP Request: request_create_lead/);
    assert.match(source, /const request_create_lead = await fetch/);
    assert.match(source, /\/\/ Node Response Mapper: map_create_lead/);
    assert.match(source, /const map_create_lead = mapPluginCreatorResponse/);
    assert.match(source, /\/\/ Node Code Block: code_after_map/);
    assert.match(source, /const code_after_map = await \(async \(\) => \{/);
  });
});
