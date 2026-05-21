import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateManifest } from "../plugins/loader.ts";
import { generatePluginAuthProvider, generatePluginManifest } from "./plugin-manifest-generator.ts";
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
        description: "Create a CRM lead",
        inputs: [
          {
            name: "email",
            type: "string",
            required: true,
            default: "",
            placeholder: "lead@example.com",
            description: "Lead email",
          },
          {
            name: "score",
            type: "number",
            required: false,
            description: "Lead score",
          },
          {
            name: "source",
            type: "select",
            required: false,
            options: [
              { label: "Website", value: "website" },
              { label: "Referral", value: "referral" },
            ],
          },
        ],
        request: {
          method: "POST",
          url: "https://api.example.com/leads",
          headers: [],
          query: [],
          body: { type: "json", value: {} },
        },
        responseMapping: [
          {
            id: "map_lead_id",
            outputName: "leadId",
            path: "body.data.id",
            type: "string",
            required: true,
          },
          {
            id: "map_tags",
            outputName: "tags",
            path: "body.data.tags",
            type: "array",
          },
        ],
        errorMapping: [],
      },
    ],
    canvas: { nodes: {}, edges: [] },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
}

describe("generatePluginManifest", () => {
  it("generates a Sailor SDK manifest with creator metadata", () => {
    const manifest = generatePluginManifest(createBlueprint(), {
      creatorVersion: "1.0.0",
    });

    assert.equal(manifest.metadata.id, "my-crm");
    assert.equal(manifest.metadata.name, "My CRM");
    assert.equal(manifest.metadata.icon, "icon.svg");
    assert.equal(manifest.metadata.iconDark, "icon-dark.svg");
    assert.equal(manifest.metadata.iconLight, "icon-light.svg");
    assert.equal(manifest["x-created-by"], "sailor-plugin-creator");
    assert.equal(manifest["x-creator-version"], "1.0.0");
    assert.equal(manifest["x-editable-low-code"], true);
    assert.deepEqual(validateManifest(manifest), []);
  });

  it("preserves extended plugin metadata from the blueprint", () => {
    const blueprint = createBlueprint();
    blueprint.metadata.category = "Development";
    blueprint.metadata.author = "Acme";
    blueprint.metadata.repository = "https://github.com/acme/plugin";
    blueprint.metadata.homepage = "https://acme.dev";
    blueprint.metadata.docsUrl = "https://docs.acme.dev/plugin";
    blueprint.metadata.tags = ["crm", "sales"];

    const manifest = generatePluginManifest(blueprint);

    assert.equal(manifest.metadata.category, "Development");
    assert.equal(manifest.metadata.author, "Acme");
    assert.equal(manifest.metadata.repository, "https://github.com/acme/plugin");
    assert.equal((manifest.metadata as any).homepage, "https://acme.dev");
    assert.equal((manifest.metadata as any).docsUrl, "https://docs.acme.dev/plugin");
    assert.deepEqual((manifest.metadata as any).tags, ["crm", "sales"]);
  });

  it("maps inputs to JSON Schema parameters", () => {
    const manifest = generatePluginManifest(createBlueprint());
    const parameters = manifest.methods.createLead.parameters;

    assert.deepEqual(parameters.required, ["email"]);
    assert.equal(parameters.properties?.email.type, "string");
    assert.equal(parameters.properties?.email.description, "Lead email");
    assert.equal(parameters.properties?.email.default, "");
    assert.equal(parameters.properties?.email["x-input-type"], "text");
    assert.equal(parameters.properties?.score.type, "number");
    assert.deepEqual(parameters.properties?.source.enum, ["website", "referral"]);
    assert.equal(parameters.properties?.source["x-input-type"], "select");
  });

  it("maps response mappings to responseSchema", () => {
    const manifest = generatePluginManifest(createBlueprint());
    const responseSchema = manifest.methods.createLead.responseSchema;

    assert.equal(responseSchema.type, "object");
    assert.deepEqual(responseSchema.required, ["leadId"]);
    assert.equal(responseSchema.properties?.leadId.type, "string");
    assert.equal(responseSchema.properties?.tags.type, "array");
    assert.equal(responseSchema.properties?.tags.items?.type, "object");
  });

  it("maps API key credentials to a Sailor auth provider shape", () => {
    const auth = generatePluginAuthProvider(createBlueprint());

    assert.equal(auth.type, "api_key");
    assert.deepEqual(auth.credentialSchema, {
      apiKey: {
        type: "string",
        inputType: "password",
        label: "API Key",
        description: undefined,
        required: true,
        placeholder: undefined,
      },
    });
  });
});
