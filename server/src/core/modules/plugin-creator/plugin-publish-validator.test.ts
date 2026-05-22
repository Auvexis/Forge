import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { validatePluginCreatorPublish } from "./plugin-publish-validator.ts";

function createBlueprint(): PluginBlueprint {
  return {
    id: "bp_publish",
    metadata: {
      handle: "publish-api",
      name: "Publish API",
      version: "0.1.0",
      description: "Publish API",
    },
    icons: {},
    auth: { type: "none", fields: [] },
    methods: [
      {
        id: "method_ping",
        handle: "ping",
        name: "Ping",
        description: "Ping",
        inputs: [],
        request: { method: "GET", url: "https://api.example.com", headers: [], query: [], body: { type: "none" } },
        responseMapping: [],
        errorMapping: [],
        codeBlocks: [],
      },
    ],
    canvas: { nodes: {}, edges: [] },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
}

function profilePaths() {
  return resolveProfilePaths({
    sailorHome: fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-publish-validator-")),
    profileId: "default",
  });
}

describe("plugin publish validator", () => {
  it("passes valid generated plugins", () => {
    const result = validatePluginCreatorPublish({ profilePaths: profilePaths(), blueprint: createBlueprint() });

    assert.equal(result.success, true);
  });

  it("fails unsafe code blocks before publish", () => {
    const blueprint = createBlueprint();
    blueprint.methods[0]!.codeBlocks = [{ id: "code_bad", name: "Bad", source: "return process.env;" }];
    blueprint.canvas.nodes = {
      node_method: { id: "node_method", type: "method", position: { x: 0, y: 0 }, data: { methodId: "method_ping" } },
      code_bad: { id: "code_bad", type: "codeBlock", position: { x: 200, y: 0 }, data: { methodId: "method_ping", codeBlockId: "code_bad" } },
    };
    blueprint.canvas.edges = [{ id: "edge_method_code", source: "node_method", target: "code_bad" }];

    const result = validatePluginCreatorPublish({ profilePaths: profilePaths(), blueprint });

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /not allowed runtime access/);
  });
});
