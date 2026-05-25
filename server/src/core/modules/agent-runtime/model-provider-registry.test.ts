import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "./agent-errors.ts";
import { AgentModelProviderRegistry } from "./model-provider-registry.ts";
import { OpenAiCompatibleProvider } from "./model-providers/openai-compatible-provider.ts";
import type { AiModelNodeConfig } from "./agent-types.ts";

describe("agent model provider registry", () => {
  it("resolves OpenAI provider with credential id", async () => {
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => ({ api_key: "sk-test" }),
    });

    const model = await registry.createChatModel(modelConfig());

    assert.ok(model);
  });

  it("resolves OpenRouter provider with a compatible base URL", async () => {
    const created: any[] = [];
    const provider = new OpenAiCompatibleProvider({
      id: "openrouter",
      credentialResolver: () => ({ api_key: "or-test" }),
      createModel: (config) => {
        created.push(config);
        return { kind: "fake-model", config };
      },
    });
    const registry = new AgentModelProviderRegistry({ providers: [provider] });

    const model = await registry.createChatModel({
      ...modelConfig(),
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    assert.equal((model as any).kind, "fake-model");
    assert.equal(created[0].configuration.baseURL, "https://openrouter.ai/api/v1");
  });

  it("rejects unknown providers", async () => {
    const registry = new AgentModelProviderRegistry({
      credentialResolver: () => ({ api_key: "sk-test" }),
    });

    await assert.rejects(
      registry.createChatModel({ ...modelConfig(), provider: "unknown" } as any),
      /unknown model provider/i,
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
    name: "OpenAI",
    provider: "openai",
    model: "gpt-4.1-mini",
    temperature: 0.2,
    maxTokens: 1000,
    credentialId: "cred_openai",
  };
}
