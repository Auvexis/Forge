import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { buildPluginMethodPlans } from "./plugin-method-plan.ts";

function createBlueprintWithMethodGraph(input: {
  nodes: string[];
  edges: Array<[string, string]>;
}): PluginBlueprint {
  const method = {
    id: "method_create_lead",
    handle: "createLead",
    name: "Create Lead",
    description: "Create a lead",
    inputs: [],
    request: {
      method: "POST" as const,
      url: "https://api.example.com/leads",
      headers: [],
      query: [],
      body: { type: "json" as const, value: {} },
    },
    responseMapping: [],
    errorMapping: [],
    codeBlocks: [
      {
        id: "code_after_map",
        name: "After map",
        source: "return previous;",
      },
    ],
  };

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
    methods: [method],
    canvas: {
      nodes: Object.fromEntries(
        input.nodes.map((id, index) => [
          id,
          {
            id,
            type:
              id.startsWith("method_")
                ? "method"
                : id.startsWith("request_")
                  ? "request"
                  : id.startsWith("map_")
                    ? "responseMapper"
                    : "codeBlock",
            position: { x: index * 240, y: 0 },
            data: { methodId: method.id, codeBlockId: id === "code_after_map" ? id : undefined },
          },
        ]),
      ),
      edges: input.edges.map(([source, target]) => ({
        id: `edge_${source}_${target}`,
        source,
        target,
      })),
    },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
}

describe("buildPluginMethodPlans", () => {
  it("orders method canvas nodes into executable method steps", () => {
    const blueprint = createBlueprintWithMethodGraph({
      nodes: ["method_create_lead", "request_create_lead", "map_create_lead", "code_after_map"],
      edges: [
        ["method_create_lead", "request_create_lead"],
        ["request_create_lead", "map_create_lead"],
        ["map_create_lead", "code_after_map"],
      ],
    });

    const [plan] = buildPluginMethodPlans(blueprint);

    assert.equal(plan?.handle, "createLead");
    assert.deepEqual(plan?.steps.map((step) => step.kind), [
      "httpRequest",
      "responseMapper",
      "codeBlock",
    ]);
  });

  it("falls back to request mapper and error steps without graph nodes", () => {
    const blueprint = createBlueprintWithMethodGraph({ nodes: [], edges: [] });

    const [plan] = buildPluginMethodPlans(blueprint);

    assert.deepEqual(plan?.steps.map((step) => step.kind), [
      "httpRequest",
      "responseMapper",
      "errorMapper",
    ]);
  });
});
