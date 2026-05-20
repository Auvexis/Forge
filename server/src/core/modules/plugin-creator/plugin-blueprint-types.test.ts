import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PLUGIN_BLUEPRINT_INPUT_TYPES } from "./plugin-blueprint-types.ts";
import type {
  PluginBlueprint,
  PluginBlueprintInputType,
  PluginBlueprintNode,
} from "./plugin-blueprint-types.ts";

describe("plugin creator blueprint types", () => {
  it("models the minimum editable blueprint shape", () => {
    const inputTypes: PluginBlueprintInputType[] = [...PLUGIN_BLUEPRINT_INPUT_TYPES];
    const methodNode: PluginBlueprintNode = {
      id: "node_method_create_lead",
      type: "method",
      position: { x: 120, y: 80 },
      data: { methodId: "method_create_lead" },
    };
    const blueprint: PluginBlueprint = {
      id: "bp_my_crm",
      metadata: {
        handle: "my-crm",
        name: "My CRM",
        version: "0.1.0",
        description: "CRM API connector",
      },
      icons: {
        icon: "icon.svg",
        iconDark: "icon-dark.svg",
        iconLight: "icon-light.svg",
      },
      auth: {
        type: "apiKey",
        fields: [
          {
            name: "apiKey",
            label: "API Key",
            target: "header",
            headerName: "Authorization",
            prefix: "Bearer ",
          },
        ],
      },
      methods: [
        {
          id: "method_create_lead",
          handle: "createLead",
          name: "Create Lead",
          description: "Create a lead in the CRM",
          category: "Leads",
          inputs: [
            {
              name: "email",
              type: inputTypes[0],
              required: true,
              default: "",
              placeholder: "lead@example.com",
              description: "Lead email",
            },
          ],
          request: {
            method: "POST",
            url: "https://api.example.com/leads",
            headers: [{ name: "Authorization", value: "{{ credentials.apiKey }}" }],
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
      ],
      canvas: {
        nodes: { [methodNode.id]: methodNode },
        edges: [
          {
            id: "edge_inputs_request",
            source: "node_inputs",
            target: "node_request",
            sourceHandle: "source",
            targetHandle: "target",
          },
        ],
      },
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
    };

    assert.equal(blueprint.metadata.handle, "my-crm");
    assert.equal(blueprint.auth.type, "apiKey");
    assert.equal(blueprint.methods[0]?.request.method, "POST");
    assert.deepEqual(inputTypes, ["string", "number", "boolean", "object", "array", "select", "file"]);
  });
});
