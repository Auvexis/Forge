import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { generatePluginMethodsSource } from "./plugin-methods-generator.ts";
import { writeMethodSource } from "./plugin-method-code-writer.ts";
import type { PluginMethodPlan } from "./plugin-method-plan-types.ts";

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
        responseMapping: [
          { id: "map_lead", outputName: "lead", path: "body", type: "object" },
        ],
        errorMapping: [],
        codeBlocks: [
          {
            id: "code_after_map",
            name: "After map",
            source: "return previous;",
          },
        ],
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
          data: {
            methodId: "method_create_lead",
            codeBlockId: "code_after_map",
          },
        },
      },
      edges: [
        {
          id: "edge_1",
          source: "method_create_lead",
          target: "request_create_lead",
        },
        {
          id: "edge_2",
          source: "request_create_lead",
          target: "map_create_lead",
        },
        { id: "edge_3", source: "map_create_lead", target: "code_after_map" },
      ],
    },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
}

describe("plugin method code writer", () => {
  it("emits method source as ordered node statements", () => {
    const source = generatePluginMethodsSource(
      createBlueprintWithRequestMapperAndCodeBlock(),
    );

    assert.match(source, /\/\/ Node HTTP Request: request_create_lead/);
    assert.match(source, /const request_create_lead = await fetch/);
    assert.match(source, /\/\/ Node Response Mapper: map_create_lead/);
    assert.match(source, /const map_create_lead = mapPluginCreatorResponse/);
    assert.match(source, /\/\/ Node Code Block: code_after_map/);
    assert.match(source, /const code_after_map = await \(async \(\) => \{/);
  });

  it("emits TypeScript for control flow and transform nodes", () => {
    const blueprint = createBlueprintWithRequestMapperAndCodeBlock();
    const method = blueprint.methods[0]!;
    const plan: PluginMethodPlan = {
      methodId: method.id,
      handle: method.handle,
      name: method.name,
      steps: [
        {
          kind: "jsonTransform",
          nodeId: "transform_payload",
          methodId: method.id,
          expression: "({ name: params.name })",
          outputName: "payload",
        },
        {
          kind: "if",
          nodeId: "if_has_name",
          methodId: method.id,
          condition: "Boolean(params.name)",
          thenSteps: [
            {
              kind: "return",
              nodeId: "return_name",
              methodId: method.id,
              valueExpression: "payload",
            },
          ],
          elseSteps: [
            {
              kind: "return",
              nodeId: "return_empty",
              methodId: method.id,
              valueExpression: "null",
            },
          ],
        },
        {
          kind: "switch",
          nodeId: "switch_status",
          methodId: method.id,
          expression: "status",
          cases: [
            {
              id: "case_ok",
              label: "OK",
              value: 200,
              handle: "case_ok",
              steps: [],
            },
          ],
          defaultSteps: [],
        },
        {
          kind: "tryCatch",
          nodeId: "try_request",
          methodId: method.id,
          errorVariable: "error",
          trySteps: [],
          catchCases: [
            {
              id: "catch_rate_limit",
              label: "Rate limit",
              errorCode: "RATE_LIMIT",
              handle: "catch_rate_limit",
              steps: [
                {
                  kind: "return",
                  nodeId: "return_retry",
                  methodId: method.id,
                  valueExpression: "error",
                },
              ],
            },
          ],
          catchSteps: [],
        },
        {
          kind: "for",
          nodeId: "for_pages",
          methodId: method.id,
          itemVariable: "page",
          fromExpression: "1",
          toExpression: "2",
          bodySteps: [],
        },
        {
          kind: "forEach",
          nodeId: "foreach_items",
          methodId: method.id,
          arrayExpression: "params.items",
          itemVariable: "item",
          bodySteps: [],
        },
      ],
    };

    const source = writeMethodSource({ blueprint, method, plan });

    assert.match(source, /\/\/ Node JSON Transform: transform_payload/);
    assert.match(source, /const payload = \(\{ name: params\.name \}\);/);
    assert.match(source, /\/\/ Node If: if_has_name/);
    assert.match(source, /if \(Boolean\(params\.name\)\)/);
    assert.match(source, /\/\/ Node Return: return_name/);
    assert.match(source, /\/\/ Node Switch: switch_status/);
    assert.match(source, /case 200:/);
    assert.match(source, /\/\/ Node Try\/Catch: try_request/);
    assert.match(source, /catch \(error\)/);
    assert.match(source, /catch_rate_limit/);
    assert.match(source, /RATE_LIMIT/);
    assert.match(source, /\/\/ Node For: for_pages/);
    assert.match(source, /for \(let page = 1; page <= 2; page \+= 1\)/);
    assert.match(source, /\/\/ Node ForEach: foreach_items/);
    assert.match(source, /for \(const item of params\.items\)/);
  });
});
