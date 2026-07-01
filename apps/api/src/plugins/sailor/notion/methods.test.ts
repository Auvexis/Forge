import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import plugin from "./index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("notion plugin", () => {
  it("exports default Sailor plugin contract", () => {
    const auth = plugin.auth as any;
    const methodNames = [
      "search",
      "getPage",
      "createPage",
      "updatePageProperties",
      "queryDatabase",
      "createDatabaseItem",
      "appendBlockChildren",
      "listBlockChildren",
    ];

    assert.equal(plugin.id, "notion");
    assert.equal(plugin.manifest.metadata.id, "notion");
    assert.equal(auth.type, "api_key");
    assert.equal(auth.credentialSchema.integration_token.inputType, "password");

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("sends bearer authenticated requests to Notion", async () => {
    const calls: any[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ object: "page", id: "page-1" }), { status: 200 });
    };

    const result = await plugin.methods.getPage(
      { pageId: "page-1" },
      { credentials: { integration_token: "secret-token" } },
    );

    assert.equal(result.id, "page-1");
    assert.equal(calls[0].url, "https://api.notion.com/v1/pages/page-1");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.Authorization, "Bearer secret-token");
    assert.equal(calls[0].init.headers["Notion-Version"], "2022-06-28");
  });

  it("accepts JSON string properties when creating a database item", async () => {
    let body: any;
    globalThis.fetch = async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: "page-2" }), { status: 200 });
    };

    await plugin.methods.createDatabaseItem(
      { databaseId: "db-1", properties: "{\"Name\":{\"title\":[{\"text\":{\"content\":\"Task\"}}]}}" },
      { credentials: { integration_token: "secret-token" } },
    );

    assert.equal(body.parent.database_id, "db-1");
    assert.equal(body.properties.Name.title[0].text.content, "Task");
  });

  it("throws clear Notion API errors", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Could not find page" }), { status: 404 });

    await assert.rejects(
      plugin.methods.getPage(
        { pageId: "missing" },
        { credentials: { integration_token: "secret-token" } },
      ),
      /Notion API error on '\/pages\/missing': Could not find page/,
    );
  });
});
