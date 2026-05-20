import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parsePluginBlueprint,
  validateMethodHandle,
  validatePluginBlueprint,
  validatePluginCreatorId,
  validatePluginHandle,
} from "./plugin-blueprint-validation.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";

function createValidBlueprint(overrides: Partial<PluginBlueprint> = {}): PluginBlueprint {
  return {
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
          required: true,
        },
      ],
    },
    methods: [
      {
        id: "method_create_lead",
        handle: "createLead",
        name: "Create Lead",
        description: "Create a lead",
        inputs: [
          {
            name: "email",
            type: "string",
            required: true,
            default: "",
            placeholder: "lead@example.com",
            description: "Lead email",
          },
        ],
        request: {
          method: "POST",
          url: "https://api.example.com/leads",
          headers: [],
          query: [],
          body: { type: "json", value: { email: "{{ params.email }}" } },
        },
        responseMapping: [],
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
    canvas: { nodes: {}, edges: [] },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("plugin blueprint validation", () => {
  it("accepts a valid blueprint and returns typed data", () => {
    const result = validatePluginBlueprint(createValidBlueprint());

    assert.equal(result.success, true);
    assert.equal(parsePluginBlueprint(createValidBlueprint()).metadata.handle, "my-crm");
  });

  it("validates plugin creator ids", () => {
    assert.equal(validatePluginCreatorId("bp_my_crm"), "bp_my_crm");
    assert.throws(() => validatePluginCreatorId("../bp_my_crm"), /Invalid plugin creator id/);
    assert.throws(() => validatePluginCreatorId("bp/my-crm"), /Invalid plugin creator id/);
  });

  it("validates plugin handles", () => {
    assert.equal(validatePluginHandle("my-crm"), "my-crm");
    assert.throws(() => validatePluginHandle("my crm"), /Invalid plugin handle/);
    assert.throws(() => validatePluginHandle("MyCRM"), /Invalid plugin handle/);
  });

  it("validates method handles", () => {
    assert.equal(validateMethodHandle("createLead"), "createLead");
    assert.throws(() => validateMethodHandle("create lead"), /Invalid method handle/);
    assert.throws(() => validateMethodHandle("create-lead"), /Invalid method handle/);
  });

  it("rejects methods without a request URL", () => {
    const blueprint = createValidBlueprint({
      methods: [
        {
          ...createValidBlueprint().methods[0]!,
          request: { ...createValidBlueprint().methods[0]!.request, url: "" },
        },
      ],
    });

    const result = validatePluginBlueprint(blueprint);

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /methods\.0\.request\.url/);
  });

  it("rejects unsupported input types", () => {
    const blueprint = createValidBlueprint({
      methods: [
        {
          ...createValidBlueprint().methods[0]!,
          inputs: [
            {
              ...createValidBlueprint().methods[0]!.inputs[0]!,
              type: "date" as any,
            },
          ],
        },
      ],
    });

    const result = validatePluginBlueprint(blueprint);

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /methods\.0\.inputs\.0\.type/);
  });

  it("rejects error mappings without an error code", () => {
    const blueprint = createValidBlueprint({
      methods: [
        {
          ...createValidBlueprint().methods[0]!,
          errorMapping: [
            {
              ...createValidBlueprint().methods[0]!.errorMapping[0]!,
              code: "",
            },
          ],
        },
      ],
    });

    const result = validatePluginBlueprint(blueprint);

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /methods\.0\.errorMapping\.0\.code/);
  });
});
