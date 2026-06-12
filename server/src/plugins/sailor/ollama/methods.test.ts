import assert from "node:assert/strict";
import { describe, it } from "node:test";

import plugin from "./index.ts";
import { createMethods } from "./methods.ts";

describe("ollama plugin", () => {
  it("declares a native chat model capability for local Ollama", () => {
    const metadata = plugin.manifest.metadata as typeof plugin.manifest.metadata & {
      agentCapabilities?: {
        chatModel?: {
          enabled?: boolean;
          adapter?: string;
          defaultModel?: string;
          defaultBaseUrl?: string;
          credentialPluginId?: string;
        };
      };
    };
    const capability = metadata.agentCapabilities?.chatModel;

    assert.equal(plugin.id, "sailor-ollama");
    assert.equal(plugin.manifest.metadata.id, "sailor-ollama");
    assert.equal(capability?.enabled, true);
    assert.equal(capability?.adapter, "ollama");
    assert.equal(capability?.defaultModel, "llama3.2");
    assert.equal(capability?.defaultBaseUrl, "http://localhost:11434/v1");
    assert.equal(capability?.credentialPluginId, "sailor-ollama");
  });

  it("accepts optional API key credentials for cloud or protected Ollama hosts", () => {
    const schema = plugin.auth.credentialSchema ?? {};

    assert.equal(schema.host.required, false);
    assert.equal(schema.host.placeholder, "http://localhost:11434");
    assert.equal(schema.model, undefined);
    assert.equal(schema.api_key.required, false);
    assert.equal(schema.api_key.inputType, "password");
  });

  it("declares model as a method parameter instead of a base credential", () => {
    const methods = plugin.manifest.methods;

    assert.equal(methods.chat.parameters.properties!.model.type, "string");
    assert.ok(methods.chat.parameters.required!.includes("model"));
    assert.equal(methods.generate.parameters.properties!.model.type, "string");
    assert.ok(methods.generate.parameters.required!.includes("model"));
    assert.equal(methods.showModel.parameters.properties!.model.type, "string");
    assert.ok(methods.showModel.parameters.required!.includes("model"));
  });

  it("calls local Ollama generate without Authorization", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const restore = mockFetch(calls, { model: "llama3.2", message: { content: "ok" }, done: true });

    try {
      const result = await createMethods().generate(
        { prompt: "hi", model: "llama3.2" },
        { credentials: { host: "http://localhost:11434" } } as any,
      );

      assert.equal(result.done, true);
      assert.equal(calls[0].url, "http://localhost:11434/api/chat");
      assert.equal((calls[0].init.headers as Record<string, string>).Authorization, undefined);
    } finally {
      restore();
    }
  });

  it("uses local Ollama host when host is not configured", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const restore = mockFetch(calls, { models: [] });

    try {
      await createMethods().listModels({}, { credentials: {} } as any);

      assert.equal(calls[0].url, "http://localhost:11434/api/tags");
    } finally {
      restore();
    }
  });

  it("sends bearer API key for Ollama cloud requests", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const restore = mockFetch(calls, { models: [] });

    try {
      await createMethods().listModels(
        {},
        {
          credentials: {
            host: "https://ollama.com",
            model: "gpt-oss:120b",
            api_key: "ollama-secret",
          },
        } as any,
      );

      assert.equal(calls[0].url, "https://ollama.com/api/tags");
      assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer ollama-secret");
    } finally {
      restore();
    }
  });

  it("declares list, chat, and show model methods", () => {
    assert.ok(plugin.manifest.methods.listModels);
    assert.ok(plugin.manifest.methods.chat);
    assert.ok(plugin.manifest.methods.showModel);
    assert.equal(typeof plugin.methods.listModels, "function");
    assert.equal(typeof plugin.methods.chat, "function");
    assert.equal(typeof plugin.methods.showModel, "function");
  });
});

function mockFetch(calls: Array<{ url: string; init: RequestInit }>, body: unknown): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return {
      ok: true,
      statusText: "OK",
      json: async () => body,
    } as Response;
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}
