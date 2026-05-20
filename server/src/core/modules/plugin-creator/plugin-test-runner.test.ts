import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { resolveProfilePaths } from "../../profiles/profile-paths.ts";
import { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import { resolveBlueprintPaths } from "./plugin-creator-paths.ts";
import { PluginTestRunner } from "./plugin-test-runner.ts";
import type { PluginBlueprintRequest } from "./plugin-blueprint-types.ts";

function createRepository() {
  const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-plugin-test-runner-"));
  const profilePaths = resolveProfilePaths({ sailorHome, profileId: "default" });
  return {
    profilePaths,
    repository: new PluginBlueprintRepository(profilePaths),
  };
}

function requestFor(url: string, overrides: Partial<PluginBlueprintRequest> = {}): PluginBlueprintRequest {
  return {
    method: "GET",
    url,
    headers: [{ name: "Authorization", value: "Bearer {{ credentials.apiKey }}" }],
    query: [],
    body: { type: "none" },
    ...overrides,
  };
}

function startServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

describe("PluginTestRunner", () => {
  it("runs GET requests and returns status, headers, body and duration", async () => {
    const server = await startServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Test", "ok");
      res.end(JSON.stringify({ ok: true }));
    });
    const runner = new PluginTestRunner({ now: () => "2026-05-20T00:00:00.000Z" });

    try {
      const result = await runner.run({
        blueprintId: "bp_my_crm",
        methodId: "method_ping",
        request: requestFor(`${server.url}/ping`),
        params: {},
        credentials: { apiKey: "secret-token" },
      });

      assert.equal(result.status, 200);
      assert.equal(result.headers["x-test"], "ok");
      assert.deepEqual(result.body, { ok: true });
      assert.equal(result.error, null);
      assert.equal(result.timestamp, "2026-05-20T00:00:00.000Z");
      assert.ok(result.durationMs >= 0);
    } finally {
      await server.close();
    }
  });

  it("runs POST JSON requests with rendered body values", async () => {
    let receivedBody = "";
    const server = await startServer((req, res) => {
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        receivedBody += chunk;
      });
      req.on("end", () => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ received: JSON.parse(receivedBody) }));
      });
    });
    const runner = new PluginTestRunner({ now: () => "2026-05-20T00:00:00.000Z" });

    try {
      const result = await runner.run({
        blueprintId: "bp_my_crm",
        methodId: "method_create",
        request: requestFor(`${server.url}/leads`, {
          method: "POST",
          headers: [{ name: "Content-Type", value: "application/json" }],
          body: { type: "json", value: { email: "{{ params.email }}" } },
        }),
        params: { email: "lead@example.com" },
        credentials: {},
      });

      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { received: { email: "lead@example.com" } });
    } finally {
      await server.close();
    }
  });

  it("returns structured errors for network failures", async () => {
    const runner = new PluginTestRunner({ now: () => "2026-05-20T00:00:00.000Z" });

    const result = await runner.run({
      blueprintId: "bp_my_crm",
      methodId: "method_ping",
      request: requestFor("http://127.0.0.1:1/unavailable"),
      params: {},
      credentials: { apiKey: "secret-token" },
    });

    assert.equal(result.status, null);
    assert.equal(result.body, null);
    assert.match(result.error ?? "", /fetch failed|bad port|ECONNREFUSED/i);
  });

  it("times out slow requests", async () => {
    const server = await startServer((_req, res) => {
      setTimeout(() => {
        res.end("late");
      }, 80);
    });
    const runner = new PluginTestRunner({ now: () => "2026-05-20T00:00:00.000Z" });

    try {
      const result = await runner.run({
        blueprintId: "bp_my_crm",
        methodId: "method_slow",
        request: requestFor(`${server.url}/slow`),
        params: {},
        credentials: { apiKey: "secret-token" },
        timeoutMs: 10,
      });

      assert.equal(result.status, null);
      assert.match(result.error ?? "", /timeout|aborted/i);
    } finally {
      await server.close();
    }
  });

  it("saves last-run without leaking credential values", async () => {
    const { profilePaths, repository } = createRepository();
    const server = await startServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
    const runner = new PluginTestRunner({
      now: () => "2026-05-20T00:00:00.000Z",
      repository,
    });

    try {
      await runner.run({
        blueprintId: "bp_my_crm",
        methodId: "method_ping",
        request: requestFor(`${server.url}/ping`),
        params: {},
        credentials: { apiKey: "secret-token" },
      });

      const lastRunPath = resolveBlueprintPaths(profilePaths, "bp_my_crm").lastRunPath;
      const contents = fs.readFileSync(lastRunPath, "utf8");

      assert.equal(contents.includes("secret-token"), false);
      assert.match(contents, /Bearer \*\*\*\*\*\*\*\*/);
    } finally {
      await server.close();
    }
  });
});
