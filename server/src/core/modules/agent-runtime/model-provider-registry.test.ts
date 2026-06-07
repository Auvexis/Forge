import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "./agent-errors.ts";
import { AgentModelProviderRegistry } from "./model-provider-registry.ts";
import { OpenAiModelProvider } from "./model-adapters/openai-model-provider.ts";
import type { AiModelNodeConfig } from "./agent-types.ts";
import { PluginManager } from "../plugins/manager.ts";

describe("agent model provider registry", () => {
  it("registers the first-class OpenAI model provider for openai-compatible configs", async () => {
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => ({ api_key: "sk-test" }),
      fetch: async () => response({ output_text: "ok" }),
    });

    const model = await registry.createChatModel(modelConfig());

    assert.equal(typeof (model as any).invoke, "function");
    assert.equal(typeof (model as any).invokeJson, "function");
    assert.equal(typeof (model as any).generateFinalResponse, "function");
  });

  it("uses credential id first and falls back to plugin credentials when unusable", async () => {
    const resolvedIds: Array<string | undefined> = [];
    const registry = new AgentModelProviderRegistry({
      credentialResolver: (credentialId) => {
        resolvedIds.push(credentialId);
        if (credentialId === "cred_generic") return credentials({ token: "" });
        if (credentialId === "generic-ai") return credentials({ apiKey: "sk-plugin" });
        return null;
      },
      fetch: async () => response({ output_text: "ok" }),
    });

    const model = await registry.createChatModel(modelConfig());

    assert.ok(model);
    assert.deepEqual(resolvedIds, ["cred_generic", "generic-ai"]);
  });

  it("falls back to plugin credentials when credential id is missing", async () => {
    const resolvedIds: Array<string | undefined> = [];
    const registry = new AgentModelProviderRegistry({
      credentialResolver: (credentialId) => {
        resolvedIds.push(credentialId);
        return credentialId === "generic-ai" ? { api_key: "sk-plugin" } : null;
      },
      fetch: async () => response({ output_text: "ok" }),
    });

    const model = await registry.createChatModel({
      ...modelConfig(),
      credentialId: undefined,
    });

    assert.ok(model);
    assert.deepEqual(resolvedIds, ["generic-ai"]);
  });

  it("uses config base URL for OpenAI-compatible models without plugin-specific branches", async () => {
    const requests: Array<{ url: string }> = [];
    const provider = new OpenAiModelProvider({
      credentialResolver: () => ({ api_key: "or-test" }),
      fetch: async (url) => {
        requests.push({ url: String(url) });
        return response({ output_text: "ok" });
      },
    });

    const model = await provider.createChatModel({
      ...modelConfig(),
      pluginId: "not-openrouter",
      baseUrl: "https://generic.example.test/v1",
    });

    await (model as any).invoke([{ role: "user", content: "hello" }]);

    assert.equal(requests[0].url, "https://generic.example.test/v1/responses");
  });

  it("creates generic local models without stored credentials", async () => {
    const requests: Array<{ url: string; headers: Record<string, string> }> = [];
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => null,
      fetch: async (url, init) => {
        requests.push({
          url: String(url),
          headers: init?.headers as Record<string, string>,
        });
        return response({ output_text: "ok" });
      },
    });

    const model = await registry.createChatModel({
      ...modelConfig(),
      pluginId: "sailor-ollama",
      adapter: "generic",
      model: "llama3.2",
      baseUrl: "http://localhost:11434/v1",
      credentialId: undefined,
    });

    await (model as any).invoke([{ role: "user", content: "hello" }]);

    assert.equal(requests[0].url, "http://localhost:11434/v1/responses");
    assert.equal(requests[0].headers.Authorization, "Bearer sailor-local");
  });

  it("creates native Ollama local models without stored credentials", async () => {
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => null,
      fetch: async () => response({ output_text: "ok" }),
    });

    const model = await registry.createChatModel({
      ...modelConfig(),
      pluginId: "sailor-ollama",
      adapter: "ollama",
      model: "llama3.2",
      baseUrl: "http://localhost:11434",
      credentialId: undefined,
    });

    assert.equal(typeof (model as any).invoke, "function");
    assert.equal(typeof (model as any).bindTools, "undefined");
  });

  it("ignores plugin thinking metadata for agent chat model capability", async () => {
    const requests: Array<{ body: any }> = [];
    PluginManager.clearPlugins();
    PluginManager.registerPlugin({
      id: "sailor-ollama",
      manifest: {
        metadata: {
          id: "sailor-ollama",
          name: "Ollama",
          version: "1.0.0",
          description: "Ollama plugin",
          categories: ["AI"],
          author: "Sailor",
          agentCapabilities: {
            chatModel: {
              enabled: true,
              adapter: "generic",
              label: "Ollama Chat Model",
              description: "Use Ollama as an agent chat model.",
              defaultModel: "llama3.2",
              thinking: {
                enabled: true,
                request: { reasoning_effort: "medium" },
              },
            },
          },
        },
        methods: {},
      },
      auth: { type: "none" },
      methods: {},
    } as any);

    try {
      const registry = new AgentModelProviderRegistry({
        credentialResolver: () => null,
        fetch: async (_url, init) => {
          requests.push({ body: JSON.parse(String(init?.body)) });
          return response({ output_text: "ok" });
        },
      });

      const model = await registry.createChatModel({
        ...modelConfig(),
        pluginId: "sailor-ollama",
        adapter: "generic",
        model: "qwen3.5:4b",
        baseUrl: "http://localhost:11434/v1",
        credentialId: undefined,
        thinkingEnabled: false,
      });

      await (model as any).invoke([{ role: "user", content: "hello" }]);

      assert.equal("think" in requests[0].body, false);
      assert.equal("thinking" in requests[0].body, false);
    } finally {
      PluginManager.clearPlugins();
    }
  });

  it("does not merge plugin thinking metadata into older saved model configs", async () => {
    const requests: Array<{ body: any }> = [];
    PluginManager.clearPlugins();
    PluginManager.registerPlugin({
      id: "sailor-ollama",
      manifest: {
        metadata: {
          id: "sailor-ollama",
          name: "Ollama",
          version: "1.0.0",
          description: "Ollama plugin",
          categories: ["AI"],
          author: "Sailor",
          agentCapabilities: {
            chatModel: {
              enabled: true,
              adapter: "generic",
              label: "Ollama Chat Model",
              description: "Use Ollama as an agent chat model.",
              defaultModel: "llama3.2",
              thinking: {
                enabled: true,
                request: { reasoning_effort: "medium" },
              },
            },
          },
        },
        methods: {},
      },
      auth: { type: "none" },
      methods: {},
    } as any);

    try {
      const registry = new AgentModelProviderRegistry({
        credentialResolver: () => null,
        fetch: async (_url, init) => {
          requests.push({ body: JSON.parse(String(init?.body)) });
          return response({ output_text: "ok" });
        },
      });

      const model = await registry.createChatModel({
        ...modelConfig(),
        pluginId: "sailor-ollama",
        adapter: "generic",
        model: "qwen3.5:4b",
        baseUrl: "http://localhost:11434/v1",
        credentialId: undefined,
        thinkingEnabled: false,
        thinkingRequest: { think: true },
      });

      await (model as any).invoke([{ role: "user", content: "hello" }]);

      assert.equal("think" in requests[0].body, false);
      assert.equal("thinking" in requests[0].body, false);
    } finally {
      PluginManager.clearPlugins();
    }
  });

  it("rejects generic remote models without credentials", async () => {
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => null,
      fetch: async () => response({ output_text: "ok" }),
    });

    await assert.rejects(
      registry.createChatModel({
        ...modelConfig(),
        pluginId: "generic-cloud",
        adapter: "generic",
        baseUrl: "https://llm.example.test/v1",
        credentialId: undefined,
      }),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MODEL_CREDENTIAL_MISSING",
    );
  });

  it("rejects unknown adapters", async () => {
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => ({ api_key: "sk-test" }),
      fetch: async () => response({ output_text: "ok" }),
    });

    await assert.rejects(
      registry.createChatModel({ ...modelConfig(), adapter: "unknown-adapter" } as any),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MODEL_PROVIDER_UNKNOWN" &&
        /unknown-adapter/.test(error.message) &&
        /adapter/i.test(error.message),
    );
  });

  it("rejects missing credentials", async () => {
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => null,
      fetch: async () => response({ output_text: "ok" }),
    });

    await assert.rejects(
      registry.createChatModel(modelConfig()),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MODEL_CREDENTIAL_MISSING",
    );
  });

  it("clamps temperature to the supported range", async () => {
    const requests: Array<{ body: any }> = [];
    const provider = new OpenAiModelProvider({
      credentialResolver: () => ({ api_key: "sk-test" }),
      fetch: async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return response({ output_text: "ok" });
      },
    });

    const model = await provider.createChatModel({ ...modelConfig(), temperature: 99 });
    await (model as any).invoke([{ role: "user", content: "hello" }]);

    assert.equal(requests[0].body.temperature, 2);
  });

  it("omits temperature for OpenAI default-temperature-only models", async () => {
    const requests: Array<{ body: any }> = [];
    const provider = new OpenAiModelProvider({
      credentialResolver: () => ({ api_key: "sk-test" }),
      fetch: async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return response({ output_text: "ok" });
      },
    });

    const model = await provider.createChatModel({ ...modelConfig(), model: "gpt-5-nano", temperature: 0.2 });
    await (model as any).invoke([{ role: "user", content: "hello" }]);

    assert.equal(Object.hasOwn(requests[0].body, "temperature"), false);
  });

  it("uses low-latency defaults for GPT-5 nano chat models", async () => {
    const requests: Array<{ body: any }> = [];
    const provider = new OpenAiModelProvider({
      credentialResolver: () => ({ api_key: "sk-test" }),
      fetch: async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return response({ output_text: "ok" });
      },
    });

    const model = await provider.createChatModel({ ...modelConfig(), model: "gpt-5-nano" });
    await (model as any).invoke([{ role: "user", content: "hello" }]);

    assert.deepEqual(requests[0].body.reasoning, { effort: "minimal" });
    assert.equal(requests[0].body.text.verbosity, "low");
  });

  it("omits OpenAI-compatible thinking requests from model config", async () => {
    const requests: Array<{ body: any }> = [];
    const provider = new OpenAiModelProvider({
      adapter: "generic",
      allowLocalNoAuth: true,
      credentialResolver: () => null,
      fetch: async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return response({ output_text: "ok" });
      },
    });

    const model = await provider.createChatModel({
      ...modelConfig(),
      pluginId: "sailor-ollama",
      adapter: "generic",
      model: "qwen3.5:4b",
      baseUrl: "http://localhost:11434/v1",
      credentialId: undefined,
      thinkingSupported: true,
      thinkingEnabled: false,
      thinkingRequest: { reasoning_effort: "medium" },
    });

    await (model as any).invoke([{ role: "user", content: "hello" }]);

    assert.equal("reasoning_effort" in requests[0].body, false);
    assert.equal("think" in requests[0].body, false);
  });

  it("omits native Ollama-style thinking requests from compatible model config", async () => {
    const requests: Array<{ body: any }> = [];
    const provider = new OpenAiModelProvider({
      adapter: "generic",
      allowLocalNoAuth: true,
      credentialResolver: () => null,
      fetch: async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return response({ output_text: "ok" });
      },
    });

    const model = await provider.createChatModel({
      ...modelConfig(),
      pluginId: "sailor-ollama",
      adapter: "generic",
      model: "qwen3.5:4b",
      baseUrl: "http://localhost:11434/v1",
      credentialId: undefined,
      thinkingSupported: true,
      thinkingEnabled: false,
      thinkingRequest: { think: true },
    });

    await (model as any).invoke([{ role: "user", content: "hello" }]);

    assert.equal("think" in requests[0].body, false);
  });

  it("does not expose API keys through JSON serialization", async () => {
    const provider = new OpenAiModelProvider({
      credentialResolver: () => ({ api_key: "sk-secret-value" }),
      fetch: async () => response({ output_text: "ok" }),
    });

    const model = await provider.createChatModel(modelConfig());

    assert.doesNotMatch(JSON.stringify(model), /sk-secret-value/);
  });
});

function modelConfig(): AiModelNodeConfig {
  return {
    type: "ai-model",
    name: "Generic AI",
    pluginId: "generic-ai",
    adapter: "openai-compatible",
    model: "gpt-4.1-mini",
    temperature: 0.2,
    maxTokens: 1000,
    credentialId: "cred_generic",
  };
}

function credentials(values: Record<string, string>): Record<string, string> {
  return values;
}

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}
