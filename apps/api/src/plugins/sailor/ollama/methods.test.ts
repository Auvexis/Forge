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
      assert.equal(calls[0].url, "http://localhost:11434/api/generate");
      assert.equal((calls[0].init.headers as Record<string, string>).Authorization, undefined);
    } finally {
      restore();
    }
  });

  it("sends advanced generate options to Ollama", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const restore = mockFetch(calls, { model: "llama3.2", response: "ok", done: true });

    try {
      await createMethods().generate(
        {
          prompt: "hi",
          model: "llama3.2",
          think: true,
          context: [1, 2, 3],
          keepAlive: "30m",
          numCtx: 8192,
          temperature: 0.4,
          topP: 0.9,
          topK: 40,
          repeatPenalty: 1.2,
          seed: 123,
          numPredict: 512,
          options: { mirostat: 2 },
        },
        { credentials: { host: "http://localhost:11434" } } as any,
      );

      assert.equal(calls[0].url, "http://localhost:11434/api/generate");
      assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
        model: "llama3.2",
        prompt: "hi",
        stream: false,
        think: true,
        context: [1, 2, 3],
        keep_alive: "30m",
        options: {
          mirostat: 2,
          num_ctx: 8192,
          temperature: 0.4,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.2,
          seed: 123,
          num_predict: 512,
        },
      });
    } finally {
      restore();
    }
  });

  it("sends advanced chat options to Ollama", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const restore = mockFetch(calls, { model: "llama3.2", message: { content: "ok" }, done: true });

    try {
      await createMethods().chat(
        {
          model: "llama3.2",
          messages: [{ role: "user", content: "hi" }],
          think: "medium",
          keepAlive: "10m",
          numCtx: 4096,
          temperature: 0.1,
          topP: 0.8,
          topK: 30,
          repeatPenalty: 1.1,
          seed: 321,
          numPredict: 128,
          options: { stop: ["END"] },
        },
        { credentials: { host: "http://localhost:11434" } } as any,
      );

      assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
        model: "llama3.2",
        messages: [{ role: "user", content: "hi" }],
        stream: false,
        think: "medium",
        keep_alive: "10m",
        options: {
          stop: ["END"],
          num_ctx: 4096,
          temperature: 0.1,
          top_p: 0.8,
          top_k: 30,
          repeat_penalty: 1.1,
          seed: 321,
          num_predict: 128,
        },
      });
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

  it("declares advanced Ollama parameters in chat and generate manifests", () => {
    const chatProperties = plugin.manifest.methods.chat.parameters.properties!;
    const generateProperties = plugin.manifest.methods.generate.parameters.properties!;

    for (const key of ["think", "keepAlive", "numCtx", "temperature", "topP", "topK", "repeatPenalty", "seed", "numPredict", "options"]) {
      assert.ok(chatProperties[key], `chat should expose ${key}`);
      assert.ok(generateProperties[key], `generate should expose ${key}`);
    }

    assert.ok(generateProperties.context);
  });

  it("declares and creates embeddings through the configured Ollama host", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const restore = mockFetch(calls, { embeddings: [[0.1, 0.2]] });

    try {
      assert.ok(plugin.manifest.methods.createEmbeddings);
      assert.equal(typeof plugin.methods.createEmbeddings, "function");

      await createMethods().createEmbeddings(
        { model: "nomic-embed-text", input: ["hello"] },
        { credentials: { host: "http://localhost:11434" } } as any,
      );

      assert.equal(calls[0].url, "http://localhost:11434/api/embed");
      assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
        model: "nomic-embed-text",
        input: ["hello"],
      });
    } finally {
      restore();
    }
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
