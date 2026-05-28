import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "./agent-errors.ts";
import { AgentModelProviderRegistry } from "./model-provider-registry.ts";
import { OpenAiCompatibleProvider } from "./model-providers/openai-compatible-provider.ts";
import type { AiModelNodeConfig } from "./agent-types.ts";

describe("agent model provider registry", () => {
  it("creates an OpenAI-compatible model for an arbitrary plugin id", async () => {
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => ({ api_key: "sk-test" }),
    });

    const model = await registry.createChatModel(modelConfig());

    assert.ok(model);
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
    });

    const model = await registry.createChatModel({
      ...modelConfig(),
      credentialId: undefined,
    });

    assert.ok(model);
    assert.deepEqual(resolvedIds, ["generic-ai"]);
  });

  it("uses config base URL for OpenAI-compatible models without plugin-specific branches", async () => {
    const created: any[] = [];
    const provider = new OpenAiCompatibleProvider({
      credentialResolver: () => ({ api_key: "or-test" }),
      createModel: (config) => {
        created.push(config);
        return { kind: "fake-model", config };
      },
    });

    const model = await provider.createChatModel({
      ...modelConfig(),
      pluginId: "not-openrouter",
      baseUrl: "https://generic.example.test/v1",
    });

    assert.equal((model as any).kind, "fake-model");
    assert.equal(created[0].configuration.baseURL, "https://generic.example.test/v1");
  });

  it("rejects unknown adapters", async () => {
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => ({ api_key: "sk-test" }),
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
    });

    await assert.rejects(
      registry.createChatModel(modelConfig()),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MODEL_CREDENTIAL_MISSING",
    );
  });

  it("clamps temperature to the supported range", async () => {
    const created: any[] = [];
    const provider = new OpenAiCompatibleProvider({
      credentialResolver: () => ({ api_key: "sk-test" }),
      createModel: (config) => {
        created.push(config);
        return { kind: "fake-model" };
      },
    });

    await provider.createChatModel({ ...modelConfig(), temperature: 99 });

    assert.equal(created[0].temperature, 2);
  });

  it("omits temperature for OpenAI default-temperature-only models", async () => {
    const created: any[] = [];
    const provider = new OpenAiCompatibleProvider({
      credentialResolver: () => ({ api_key: "sk-test" }),
      createModel: (config) => {
        created.push(config);
        return { kind: "fake-model" };
      },
    });

    await provider.createChatModel({ ...modelConfig(), model: "gpt-5-nano", temperature: 0.2 });

    assert.equal(Object.hasOwn(created[0], "temperature"), false);
  });

  it("uses low-latency defaults for GPT-5 nano chat models", async () => {
    const created: any[] = [];
    const provider = new OpenAiCompatibleProvider({
      credentialResolver: () => ({ api_key: "sk-test" }),
      createModel: (config) => {
        created.push(config);
        return { kind: "fake-model" };
      },
    });

    await provider.createChatModel({ ...modelConfig(), model: "gpt-5-nano" });

    assert.deepEqual(created[0].reasoning, { effort: "minimal" });
    assert.equal(created[0].verbosity, "low");
  });

  it("does not expose API keys through JSON serialization", async () => {
    const provider = new OpenAiCompatibleProvider({
      credentialResolver: () => ({ api_key: "sk-secret-value" }),
      createModel: (config) => ({ publicConfig: config }),
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
