import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { inferPluginCreatorValueType, mapPluginCreatorResponse } from "./plugin-response-mapper.ts";
import type { PluginBlueprintResponseMapping } from "./plugin-blueprint-types.ts";

const response = {
  status: 200,
  headers: { "content-type": "application/json" },
  body: {
    data: {
      id: "lead_123",
      score: 42,
      tags: ["new", "vip"],
      owner: { name: "Ada" },
    },
  },
};

function mapping(
  outputName: string,
  path: string,
  required = false,
): PluginBlueprintResponseMapping {
  return {
    id: `map_${outputName}`,
    outputName,
    path,
    type: "string",
    required,
  };
}

describe("plugin response mapper", () => {
  it("extracts values by response path", () => {
    const output = mapPluginCreatorResponse(response, [
      mapping("leadId", "body.data.id", true),
      mapping("tags", "body.data.tags"),
      mapping("owner", "body.data.owner"),
    ]);

    assert.deepEqual(output, {
      leadId: "lead_123",
      tags: ["new", "vip"],
      owner: { name: "Ada" },
    });
  });

  it("returns null for missing optional paths", () => {
    const output = mapPluginCreatorResponse(response, [
      mapping("missing", "body.data.missing", false),
    ]);

    assert.deepEqual(output, { missing: null });
  });

  it("throws for missing required paths", () => {
    assert.throws(
      () => mapPluginCreatorResponse(response, [mapping("missing", "body.data.missing", true)]),
      /Required response path not found: body\.data\.missing/,
    );
  });

  it("supports status and headers paths", () => {
    const output = mapPluginCreatorResponse(response, [
      mapping("statusCode", "status", true),
      mapping("contentType", "headers.content-type", true),
    ]);

    assert.deepEqual(output, {
      statusCode: 200,
      contentType: "application/json",
    });
  });

  it("infers basic value types for previews", () => {
    assert.equal(inferPluginCreatorValueType("abc"), "string");
    assert.equal(inferPluginCreatorValueType(1), "number");
    assert.equal(inferPluginCreatorValueType(true), "boolean");
    assert.equal(inferPluginCreatorValueType(["a"]), "array");
    assert.equal(inferPluginCreatorValueType({ ok: true }), "object");
    assert.equal(inferPluginCreatorValueType(null), "object");
  });
});
