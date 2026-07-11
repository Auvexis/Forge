import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import plugin from "./index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("github plugin", () => {
  it("exports default Fabric plugin contract", () => {
    const auth = plugin.auth as any;
    const methodNames = [
      "getRepository",
      "listIssues",
      "createIssue",
      "updateIssue",
      "addIssueComment",
      "listPullRequests",
      "createPullRequest",
      "listWorkflowRuns",
    ];

    assert.equal(plugin.id, "github");
    assert.equal(plugin.manifest.metadata.id, "github");
    assert.equal(auth.type, "api_key");
    assert.equal(auth.credentialSchema.token.inputType, "password");

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("sends bearer authenticated requests to GitHub", async () => {
    const calls: any[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ full_name: "acme/app" }), { status: 200 });
    };

    const result = await plugin.methods.getRepository(
      { owner: "acme", repo: "app" },
      { credentials: { token: "ghp-token" } },
    );

    assert.equal(result.full_name, "acme/app");
    assert.equal(calls[0].url, "https://api.github.com/repos/acme/app");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.Authorization, "Bearer ghp-token");
    assert.equal(calls[0].init.headers.Accept, "application/vnd.github+json");
  });

  it("normalizes labels when creating an issue", async () => {
    let body: any;
    globalThis.fetch = async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ number: 7 }), { status: 201 });
    };

    await plugin.methods.createIssue(
      { owner: "acme", repo: "app", title: "Bug", labels: "bug,urgent" },
      { credentials: { token: "ghp-token" } },
    );

    assert.deepEqual(body.labels, ["bug", "urgent"]);
  });

  it("throws clear GitHub API errors", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });

    await assert.rejects(
      plugin.methods.getRepository(
        { owner: "missing", repo: "app" },
        { credentials: { token: "ghp-token" } },
      ),
      /GitHub API error on '\/repos\/missing\/app': 404 Not Found/,
    );
  });
});
