import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import plugin from "./index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("openrouter plugin", () => {
  it("exports default Sailor plugin contract", () => {
    const auth = plugin.auth as any;
    const methodNames = [
      "listModels",
      "chatCompletion",
      "jsonChatCompletion",
      "routePrompt",
      "compareModels",
      "summarizeText",
      "extractJson",
      "moderatePromptLocalRules",
    ];

    assert.equal(plugin.id, "openrouter");
    assert.equal(plugin.manifest.metadata.id, "openrouter");
    assert.equal(auth.type, "api_key");
    assert.equal(auth.credentialSchema.api_key.inputType, "password");

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("sends bearer authenticated requests to OpenRouter", async () => {
    const calls: any[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
    };

    await plugin.methods.chatCompletion(
      { model: "openai/gpt-4o-mini", messages: [{ role: "user", content: "hi" }] },
      { credentials: { api_key: "or-token" } },
    );

    assert.equal(calls[0].url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(calls[0].init.headers.Authorization, "Bearer or-token");
  });

  it("adds JSON response format for json chat", async () => {
    let body: any;
    globalThis.fetch = async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
    };

    await plugin.methods.jsonChatCompletion(
      { model: "openai/gpt-4o-mini", prompt: "return json" },
      { credentials: { api_key: "or-token" } },
    );

    assert.equal(body.response_format.type, "json_object");
  });

  it("blocks prompts matching local moderation rules", async () => {
    const result = await plugin.methods.moderatePromptLocalRules({ prompt: "steal password" }, { credentials: { api_key: "or-token" } });
    assert.equal(result.allowed, false);
  });
});
