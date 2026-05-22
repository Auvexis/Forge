import assert from "node:assert/strict";
import http from "node:http";
import { describe, it } from "node:test";

import type {
  PluginBlueprint,
  PluginBlueprintMethod,
} from "./plugin-blueprint-types.ts";
import type { PluginMethodPlan } from "./plugin-method-plan-types.ts";
import { PluginMethodPlanRunner } from "./plugin-method-plan-runner.ts";

function createMethod(url: string): PluginBlueprintMethod {
  return {
    id: "method_ping",
    handle: "ping",
    name: "Ping",
    description: "Ping",
    inputs: [],
    request: {
      method: "POST",
      url,
      headers: [
        { name: "Authorization", value: "Bearer {{ credentials.apiKey }}" },
      ],
      query: [{ name: "name", value: "{{ params.name }}" }],
      body: { type: "json", value: { name: "{{ params.name }}" } },
    },
    responseMapping: [
      { id: "map_id", outputName: "id", path: "body.id", type: "string" },
    ],
    errorMapping: [
      {
        id: "err_bad",
        code: "BAD_REQUEST",
        condition: { source: "status", operator: "equals", value: 400 },
        message: { type: "static", value: "Bad request" },
      },
    ],
    codeBlocks: [
      {
        id: "code_shape",
        name: "Shape output",
        source: "return { shaped: previous.id, name: params.name };",
      },
    ],
  };
}

function createBlueprint(method: PluginBlueprintMethod): PluginBlueprint {
  return {
    id: "bp_ping",
    metadata: {
      handle: "ping-api",
      name: "Ping API",
      version: "0.1.0",
      description: "Ping API",
    },
    icons: {},
    auth: { type: "none", fields: [] },
    methods: [method],
    canvas: { nodes: {}, edges: [] },
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
}

function createPlan(steps: PluginMethodPlan["steps"]): PluginMethodPlan {
  return {
    methodId: "method_ping",
    handle: "ping",
    name: "Ping",
    steps,
  };
}

function startServer(
  status = 201,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    assert.equal(req.headers.authorization, "Bearer secret-token");
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(status >= 400 ? { message: "bad" } : { id: "lead_1" }),
    );
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve({
        url: `http://127.0.0.1:${address.port}/lead`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

describe("PluginMethodPlanRunner", () => {
  it("runs request, response mapper and code block with per-node trace", async () => {
    const server = await startServer();
    const method = createMethod(server.url);
    const runner = new PluginMethodPlanRunner({
      now: () => "2026-05-20T00:00:00.000Z",
    });

    try {
      const result = await runner.run({
        blueprint: createBlueprint(method),
        method,
        plan: createPlan([
          { kind: "httpRequest", nodeId: "request_ping", methodId: method.id },
          { kind: "responseMapper", nodeId: "map_ping", methodId: method.id },
          {
            kind: "codeBlock",
            nodeId: "code_shape",
            methodId: method.id,
            codeBlockId: "code_shape",
          },
        ]),
        params: { name: "Ada" },
        credentials: { apiKey: "secret-token" },
      });

      assert.equal(result.status, 201);
      assert.deepEqual(result.body, { shaped: "lead_1", name: "Ada" });
      assert.equal(JSON.stringify(result).includes("secret-token"), false);
      assert.match(JSON.stringify(result.request), /Bearer \*\*\*\*\*\*\*\*/);
      assert.deepEqual(
        result.trace.map((event) => event.type),
        [
          "node:running",
          "node:success",
          "node:running",
          "node:success",
          "node:running",
          "node:success",
          "method:success",
        ],
      );
    } finally {
      await server.close();
    }
  });

  it("runs only the selected if branch and return controls final output", async () => {
    const method = createMethod("https://example.com/not-called");
    const runner = new PluginMethodPlanRunner();

    const result = await runner.run({
      blueprint: createBlueprint(method),
      method,
      plan: createPlan([
        {
          kind: "if",
          nodeId: "if_enabled",
          methodId: method.id,
          condition: "params.enabled",
          thenSteps: [
            {
              kind: "return",
              nodeId: "return_yes",
              methodId: method.id,
              valueExpression: "({ ok: true })",
            },
          ],
          elseSteps: [
            {
              kind: "return",
              nodeId: "return_no",
              methodId: method.id,
              valueExpression: "({ ok: false })",
            },
          ],
        },
      ]),
      params: { enabled: true },
      credentials: {},
    });

    assert.deepEqual(result.body, { ok: true });
    assert.equal(
      result.trace.some((event) => event.nodeId === "return_no"),
      false,
    );
  });

  it("maps configured errors as failed node trace", async () => {
    const server = await startServer(400);
    const method = createMethod(server.url);
    const runner = new PluginMethodPlanRunner();

    try {
      const result = await runner.run({
        blueprint: createBlueprint(method),
        method,
        plan: createPlan([
          { kind: "httpRequest", nodeId: "request_ping", methodId: method.id },
          { kind: "errorMapper", nodeId: "error_ping", methodId: method.id },
        ]),
        params: { name: "Ada" },
        credentials: { apiKey: "secret-token" },
      });

      assert.equal(result.status, 400);
      assert.equal(result.error, "Bad request");
      assert.equal(result.trace.at(-1)?.type, "method:failed");
      assert.equal(
        result.trace.some((event) => event.type === "node:failed"),
        true,
      );
    } finally {
      await server.close();
    }
  });

  it("runs switch default and aggregates forEach outputs", async () => {
    const method = {
      ...createMethod("https://example.com/not-called"),
      codeBlocks: [
        {
          id: "code_item",
          name: "Map item",
          source: "return { value: previous };",
        },
      ],
    };
    const runner = new PluginMethodPlanRunner();

    const result = await runner.run({
      blueprint: createBlueprint(method),
      method,
      plan: createPlan([
        {
          kind: "switch",
          nodeId: "switch_mode",
          methodId: method.id,
          expression: "params.mode",
          cases: [
            {
              id: "case_single",
              label: "Single",
              value: "single",
              handle: "case_single",
              steps: [
                {
                  kind: "return",
                  nodeId: "return_single",
                  methodId: method.id,
                  valueExpression: "({ single: true })",
                },
              ],
            },
          ],
          defaultSteps: [
            {
              kind: "forEach",
              nodeId: "foreach_items",
              methodId: method.id,
              arrayExpression: "params.items",
              itemVariable: "item",
              bodySteps: [
                {
                  kind: "codeBlock",
                  nodeId: "code_item",
                  methodId: method.id,
                  codeBlockId: "code_item",
                },
              ],
            },
          ],
        },
      ]),
      params: { mode: "many", items: ["a", "b"] },
      credentials: {},
    });

    assert.deepEqual(result.body, [{ value: "a" }, { value: "b" }]);
    assert.equal(
      result.trace.some((event) => event.nodeId === "return_single"),
      false,
    );
  });

  it("try/catch catches code block errors and runs catch steps", async () => {
    const method = {
      ...createMethod("https://example.com/not-called"),
      codeBlocks: [
        {
          id: "code_throw",
          name: "Throw",
          source: "throw new Error('boom');",
        },
      ],
    };
    const runner = new PluginMethodPlanRunner();

    const result = await runner.run({
      blueprint: createBlueprint(method),
      method,
      plan: createPlan([
        {
          kind: "tryCatch",
          nodeId: "try_code",
          methodId: method.id,
          errorVariable: "error",
          trySteps: [
            {
              kind: "codeBlock",
              nodeId: "code_throw",
              methodId: method.id,
              codeBlockId: "code_throw",
            },
          ],
          catchCases: [],
          catchSteps: [
            {
              kind: "return",
              nodeId: "return_caught",
              methodId: method.id,
              valueExpression: "previous",
            },
          ],
        },
      ]),
      params: {},
      credentials: {},
    });

    assert.deepEqual(result.body, { error: "boom" });
    assert.equal(result.error, null);
    assert.equal(
      result.trace.some(
        (event) =>
          event.type === "node:failed" && event.nodeId === "code_throw",
      ),
      true,
    );
  });

  it("try/catch routes matching error codes into catch cases", async () => {
    const method = {
      ...createMethod("https://example.com/not-called"),
      codeBlocks: [
        {
          id: "code_throw_rate_limit",
          name: "Throw rate limit",
          source:
            "const error = new Error('slow down'); error.code = 'RATE_LIMIT'; throw error;",
        },
      ],
    };
    const runner = new PluginMethodPlanRunner();

    const result = await runner.run({
      blueprint: createBlueprint(method),
      method,
      plan: createPlan([
        {
          kind: "tryCatch",
          nodeId: "try_code",
          methodId: method.id,
          errorVariable: "error",
          trySteps: [
            {
              kind: "codeBlock",
              nodeId: "code_throw_rate_limit",
              methodId: method.id,
              codeBlockId: "code_throw_rate_limit",
            },
          ],
          catchCases: [
            {
              id: "catch_rate_limit",
              label: "Rate limit",
              errorCode: "RATE_LIMIT",
              handle: "catch_rate_limit",
              steps: [
                {
                  kind: "return",
                  nodeId: "return_rate_limit",
                  methodId: method.id,
                  valueExpression:
                    "({ handled: previous.error.message, code: previous.error.code })",
                },
              ],
            },
          ],
          catchSteps: [
            {
              kind: "return",
              nodeId: "return_fallback",
              methodId: method.id,
              valueExpression: "({ fallback: true })",
            },
          ],
        },
      ]),
      params: {},
      credentials: {},
    });

    assert.deepEqual(result.body, { handled: "slow down", code: "RATE_LIMIT" });
    assert.equal(
      result.trace.some((event) => event.nodeId === "return_fallback"),
      false,
    );
  });
});
