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

  it("nests if branches from source handles", () => {
    const blueprint = createBlueprintWithMethodGraph({
      nodes: ["method_create_lead", "if_has_email", "request_then", "code_else"],
      edges: [
        ["method_create_lead", "if_has_email"],
        ["if_has_email", "request_then"],
        ["if_has_email", "code_else"],
      ],
    });
    blueprint.canvas.nodes.if_has_email!.type = "if";
    blueprint.canvas.nodes.if_has_email!.data = {
      methodId: "method_create_lead",
      condition: "params.email",
    };
    blueprint.canvas.edges[1]!.sourceHandle = "then";
    blueprint.canvas.edges[2]!.sourceHandle = "else";

    const [plan] = buildPluginMethodPlans(blueprint);
    const [step] = plan!.steps;

    assert.equal(step?.kind, "if");
    assert.deepEqual(step?.thenSteps.map((candidate) => candidate.kind), ["httpRequest"]);
    assert.deepEqual(step?.elseSteps.map((candidate) => candidate.kind), ["codeBlock"]);
  });

  it("nests switch cases and default steps", () => {
    const blueprint = createBlueprintWithMethodGraph({
      nodes: ["method_create_lead", "switch_status", "request_ok", "code_default"],
      edges: [
        ["method_create_lead", "switch_status"],
        ["switch_status", "request_ok"],
        ["switch_status", "code_default"],
      ],
    });
    blueprint.canvas.nodes.switch_status!.type = "switch";
    blueprint.canvas.nodes.switch_status!.data = {
      methodId: "method_create_lead",
      expression: "response.status",
      cases: [{ id: "case_ok", label: "OK", value: 200, handle: "case_ok" }],
    };
    blueprint.canvas.edges[1]!.sourceHandle = "case_ok";
    blueprint.canvas.edges[2]!.sourceHandle = "default";

    const [plan] = buildPluginMethodPlans(blueprint);
    const [step] = plan!.steps;

    assert.equal(step?.kind, "switch");
    assert.equal(step?.cases[0]?.handle, "case_ok");
    assert.deepEqual(step?.cases[0]?.steps.map((candidate) => candidate.kind), ["httpRequest"]);
    assert.deepEqual(step?.defaultSteps.map((candidate) => candidate.kind), ["codeBlock"]);
  });

  it("nests try and catch steps", () => {
    const blueprint = createBlueprintWithMethodGraph({
      nodes: ["method_create_lead", "try_request", "request_try", "code_catch"],
      edges: [
        ["method_create_lead", "try_request"],
        ["try_request", "request_try"],
        ["try_request", "code_catch"],
      ],
    });
    blueprint.canvas.nodes.try_request!.type = "tryCatch";
    blueprint.canvas.nodes.try_request!.data = {
      methodId: "method_create_lead",
      errorVariable: "error",
    };
    blueprint.canvas.edges[1]!.sourceHandle = "try";
    blueprint.canvas.edges[2]!.sourceHandle = "catch";

    const [plan] = buildPluginMethodPlans(blueprint);
    const [step] = plan!.steps;

    assert.equal(step?.kind, "tryCatch");
    assert.deepEqual(step?.trySteps.map((candidate) => candidate.kind), ["httpRequest"]);
    assert.deepEqual(step?.catchSteps.map((candidate) => candidate.kind), ["codeBlock"]);
  });

  it("nests forEach body steps", () => {
    const blueprint = createBlueprintWithMethodGraph({
      nodes: ["method_create_lead", "foreach_items", "code_after_map"],
      edges: [
        ["method_create_lead", "foreach_items"],
        ["foreach_items", "code_after_map"],
      ],
    });
    blueprint.canvas.nodes.foreach_items!.type = "forEach";
    blueprint.canvas.nodes.foreach_items!.data = {
      methodId: "method_create_lead",
      arrayExpression: "params.items",
      itemVariable: "item",
    };
    blueprint.canvas.edges[1]!.sourceHandle = "body";

    const [plan] = buildPluginMethodPlans(blueprint);
    const [step] = plan!.steps;

    assert.equal(step?.kind, "forEach");
    assert.deepEqual(step?.bodySteps.map((candidate) => candidate.kind), ["codeBlock"]);
  });

  it("stops the method plan at a return node", () => {
    const blueprint = createBlueprintWithMethodGraph({
      nodes: ["method_create_lead", "return_payload", "request_create_lead"],
      edges: [
        ["method_create_lead", "return_payload"],
        ["return_payload", "request_create_lead"],
      ],
    });
    blueprint.canvas.nodes.return_payload!.type = "return";
    blueprint.canvas.nodes.return_payload!.data = {
      methodId: "method_create_lead",
      valueExpression: "previous",
    };

    const [plan] = buildPluginMethodPlans(blueprint);

    assert.deepEqual(plan?.steps.map((step) => step.kind), ["return"]);
  });
});
