import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapPluginCreatorError } from "./plugin-error-mapper.ts";
import type { PluginBlueprintErrorMapping } from "./plugin-blueprint-types.ts";

const response = {
  status: 401,
  headers: {},
  body: {
    success: false,
    message: "Invalid token",
    error: { message: "Token expired" },
  },
};

function rule(
  overrides: Partial<PluginBlueprintErrorMapping>,
): PluginBlueprintErrorMapping {
  return {
    id: "err_rule",
    code: "INVALID_CREDENTIALS",
    condition: { source: "status", operator: "equals", value: 401 },
    message: { type: "static", value: "Credenciais invalidas" },
    ...overrides,
  };
}

describe("plugin error mapper", () => {
  it("maps status equality rules", () => {
    const mapped = mapPluginCreatorError(response, [rule({})]);

    assert.deepEqual(mapped, {
      code: "INVALID_CREDENTIALS",
      message: "Credenciais invalidas",
      status: 401,
      details: response.body,
    });
  });

  it("maps status range rules", () => {
    const mapped = mapPluginCreatorError(
      { ...response, status: 503 },
      [
        rule({
          code: "EXTERNAL_API_UNAVAILABLE",
          condition: { source: "status", operator: "greaterThanOrEquals", value: 500 },
          message: { type: "static", value: "API externa indisponivel" },
        }),
      ],
    );

    assert.equal(mapped?.code, "EXTERNAL_API_UNAVAILABLE");
    assert.equal(mapped?.message, "API externa indisponivel");
  });

  it("maps body path value rules", () => {
    const mapped = mapPluginCreatorError(response, [
      rule({
        code: "API_REJECTED",
        condition: { source: "body", path: "success", operator: "equals", value: false },
        message: { type: "bodyPath", path: "message" },
      }),
    ]);

    assert.equal(mapped?.code, "API_REJECTED");
    assert.equal(mapped?.message, "Invalid token");
  });

  it("maps body path existence rules", () => {
    const mapped = mapPluginCreatorError(response, [
      rule({
        code: "REMOTE_ERROR",
        condition: { source: "body", path: "error.message", operator: "exists" },
        message: { type: "bodyPath", path: "error.message" },
      }),
    ]);

    assert.equal(mapped?.code, "REMOTE_ERROR");
    assert.equal(mapped?.message, "Token expired");
  });

  it("returns null when no rule matches", () => {
    const mapped = mapPluginCreatorError(response, [
      rule({ condition: { source: "status", operator: "equals", value: 404 } }),
    ]);

    assert.equal(mapped, null);
  });

  it("uses fallback message when body path message is missing", () => {
    const mapped = mapPluginCreatorError(response, [
      rule({
        condition: { source: "status", operator: "equals", value: 401 },
        message: { type: "bodyPath", path: "missing.message", fallback: "Fallback" },
      }),
    ]);

    assert.equal(mapped?.message, "Fallback");
  });
});
