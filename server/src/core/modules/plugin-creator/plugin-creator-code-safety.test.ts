import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { generatePluginMethodsSource } from "./plugin-methods-generator.ts";
import { renderPluginRequestTemplate } from "./plugin-request-template.ts";

function createBlueprint(): PluginBlueprint {
  return {
    id: "bp_safe",
    metadata: {
      handle: "safe-api",
      name: "Safe API",
      version: "0.1.0",
      description: "Safety connector",
    },
    icons: {},
    auth: { type: "none", fields: [] },
    methods: [
      {
        id: "method_safe",
        handle: "safeMethod",
        name: "Safe Method",
        description: "Safe method",
        inputs: [],
        request: {
          method: "GET",
          url: "https://api.example.com/safe",
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

describe("plugin creator code safety", () => {
  it("escapes malicious blueprint strings in generated methods", () => {
    const blueprint = createBlueprint();
    blueprint.methods[0]!.request.url = 'https://api.example.com"; process.exit(1); "';

    const source = generatePluginMethodsSource(blueprint);

    assert.equal(source.includes('"; process.exit(1); ";\n'), false);
    assert.match(source, /process\.exit\(1\)/);
    assert.match(source, /\\"; process\.exit\(1\); \\"/);
  });

  it("rejects template constructor access", () => {
    assert.throws(
      () =>
        renderPluginRequestTemplate({
          request: {
            method: "GET",
            url: "https://api.example.com/{{ params.constructor.constructor }}",
            headers: [],
            query: [],
            body: { type: "none" },
          },
          params: {},
          credentials: {},
        }),
      /Unsafe template path/,
    );
  });

  it("rejects unsupported template roots", () => {
    assert.throws(
      () =>
        renderPluginRequestTemplate({
          request: {
            method: "GET",
            url: "https://api.example.com/{{ process.env.SECRET }}",
            headers: [],
            query: [],
            body: { type: "none" },
          },
          params: {},
          credentials: {},
        }),
      /Unsupported template root: process/,
    );
  });
});
