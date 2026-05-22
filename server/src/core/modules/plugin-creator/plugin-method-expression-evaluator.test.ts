import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluatePluginCreatorExpression,
  isPluginCreatorExpressionSafe,
} from "./plugin-method-expression-evaluator.ts";

describe("plugin method expression evaluator", () => {
  it("evaluates expressions against the allowed context", () => {
    const result = evaluatePluginCreatorExpression("params.count + response.status", {
      params: { count: 2 },
      credentials: { token: "secret" },
      previous: { ok: true },
      steps: {},
      response: { status: 200, headers: {}, body: { id: 123 } },
      body: { id: 123 },
      headers: {},
      status: 200,
    });

    assert.equal(result, 202);
  });

  it("evaluates object transform expressions", () => {
    const result = evaluatePluginCreatorExpression("({ email: params.email, id: body.id })", {
      params: { email: "lead@example.com" },
      credentials: {},
      previous: null,
      steps: {},
      response: { status: 201, headers: {}, body: { id: "lead_1" } },
      body: { id: "lead_1" },
      headers: {},
      status: 201,
    });

    assert.deepEqual(result, { email: "lead@example.com", id: "lead_1" });
  });

  it("rejects forbidden runtime tokens with typed unsafe errors", () => {
    for (const token of [
      "import('node:fs')",
      "require('fs')",
      "process.env",
      "fs.readFileSync",
      "child_process.exec",
      "eval('1 + 1')",
      "Function('return 1')",
      "globalThis.process",
      "window.location",
      "document.cookie",
      "__dirname",
      "__filename",
    ]) {
      const result = isPluginCreatorExpressionSafe(token);

      assert.equal(result.safe, false, token);
      assert.equal(result.code, "unsafe_expression");
    }
  });

  it("throws a clear error for unsafe expressions", () => {
    assert.throws(
      () =>
        evaluatePluginCreatorExpression("process.env", {
          params: {},
          credentials: {},
          previous: null,
          steps: {},
          response: null,
          body: null,
          headers: {},
          status: null,
        }),
      /Unsafe expression: forbidden token "process"/,
    );
  });
});
