import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import plugin from "./index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("openai plugin", () => {
  it("exports default Sailor plugin contract", () => {
    const auth = plugin.auth as any;
    const methodNames = [
      "listModels",
      "createResponse",
      "chatCompletion",
      "structuredResponse",
      "summarizeText",
      "extractJson",
      "classifyText",
      "generateImage",
    ];

    assert.equal(plugin.id, "openai");
    assert.equal(plugin.manifest.metadata.id, "openai");
    assert.equal(auth.type, "api_key");
    assert.equal(auth.credentialSchema.api_key.inputType, "password");

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("sends bearer authenticated requests to OpenAI", async () => {
    const calls: any[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: "resp_1" }), { status: 200 });
    };

    await plugin.methods.createResponse(
      { model: "gpt-4.1-mini", input: "hi" },
      { credentials: { api_key: "sk-token" } },
    );

    assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
    assert.equal(calls[0].init.headers.Authorization, "Bearer sk-token");
  });

  it("builds structured response text format", async () => {
    let body: any;
    globalThis.fetch = async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: "resp_1" }), { status: 200 });
    };

    await plugin.methods.structuredResponse(
      { model: "gpt-4.1-mini", input: "extract", schema: "{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"}}}" },
      { credentials: { api_key: "sk-token" } },
    );

    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.name, "structured_response");
  });

  it("throws clear OpenAI API errors", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 });

    await assert.rejects(
      plugin.methods.listModels({}, { credentials: { api_key: "bad" } }),
      /OpenAI API error on '\/v1\/models': Invalid API key/,
    );
  });
});
