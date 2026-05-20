import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SailorPluginError,
  assertHttpOk,
} from "./plugin-generated-http-helpers.ts";

describe("plugin generated HTTP helpers", () => {
  it("preserves structured plugin error metadata", () => {
    const error = new SailorPluginError("Credenciais invalidas", {
      code: "INVALID_CREDENTIALS",
      status: 401,
      details: { ok: false },
    });

    assert.equal(error.name, "SailorPluginError");
    assert.equal(error.message, "Credenciais invalidas");
    assert.equal(error.code, "INVALID_CREDENTIALS");
    assert.equal(error.status, 401);
    assert.deepEqual(error.details, { ok: false });
  });

  it("does not throw for 2xx responses", () => {
    assert.doesNotThrow(() =>
      assertHttpOk({ status: 204, body: null }, { 401: "Credenciais invalidas" }),
    );
  });

  it("throws a mapped error for known statuses", () => {
    assert.throws(
      () =>
        assertHttpOk(
          { status: 401, body: { error: "bad token" } },
          { 401: "Credenciais invalidas" },
        ),
      (error) => {
        assert.ok(error instanceof SailorPluginError);
        assert.equal(error.message, "Credenciais invalidas");
        assert.equal(error.code, "HTTP_401");
        assert.equal(error.status, 401);
        assert.deepEqual(error.details, { error: "bad token" });
        return true;
      },
    );
  });

  it("throws a fallback error for unmapped statuses", () => {
    assert.throws(
      () => assertHttpOk({ status: 503, body: "unavailable" }),
      (error) => {
        assert.ok(error instanceof SailorPluginError);
        assert.equal(error.message, "HTTP request failed with status 503");
        assert.equal(error.code, "HTTP_503");
        assert.equal(error.status, 503);
        assert.equal(error.details, "unavailable");
        return true;
      },
    );
  });
});
