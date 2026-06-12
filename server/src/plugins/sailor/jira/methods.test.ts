import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import plugin from "./index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("jira plugin", () => {
  it("exports default Sailor plugin contract", () => {
    const auth = plugin.auth as any;
    const methodNames = [
      "listProjects",
      "searchIssues",
      "getIssue",
      "createIssue",
      "updateIssue",
      "transitionIssue",
      "addComment",
      "assignIssue",
    ];

    assert.equal(plugin.id, "jira");
    assert.equal(plugin.manifest.metadata.id, "jira");
    assert.equal(auth.type, "api_key");
    assert.equal(auth.credentialSchema.base_url.inputType, "text");
    assert.equal(auth.credentialSchema.email.inputType, "text");
    assert.equal(auth.credentialSchema.api_token.inputType, "password");

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("sends basic authenticated requests to Jira", async () => {
    const calls: any[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify([{ key: "APP" }]), { status: 200 });
    };

    const result = await plugin.methods.listProjects(
      {},
      { credentials: { base_url: "https://acme.atlassian.net/", email: "dev@acme.test", api_token: "token-1" } },
    );

    assert.equal(result[0].key, "APP");
    assert.equal(calls[0].url, "https://acme.atlassian.net/rest/api/3/project/search");
    assert.equal(calls[0].init.method, "GET");
    assert.match(calls[0].init.headers.Authorization, /^Basic /);
  });

  it("accepts JSON string fields when creating an issue", async () => {
    let body: any;
    globalThis.fetch = async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ key: "APP-1" }), { status: 201 });
    };

    await plugin.methods.createIssue(
      { projectKey: "APP", issueType: "Task", summary: "Ship", fields: "{\"labels\":[\"ops\"]}" },
      { credentials: { base_url: "https://acme.atlassian.net", email: "dev@acme.test", api_token: "token-1" } },
    );

    assert.equal(body.fields.project.key, "APP");
    assert.equal(body.fields.issuetype.name, "Task");
    assert.deepEqual(body.fields.labels, ["ops"]);
  });

  it("throws clear Jira API errors", async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ errorMessages: ["Issue does not exist"] }), { status: 404 });

    await assert.rejects(
      plugin.methods.getIssue(
        { issueIdOrKey: "APP-404" },
        { credentials: { base_url: "https://acme.atlassian.net", email: "dev@acme.test", api_token: "token-1" } },
      ),
      /Jira API error on '\/rest\/api\/3\/issue\/APP-404': Issue does not exist/,
    );
  });
});
