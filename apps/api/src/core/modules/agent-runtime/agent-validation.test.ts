import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AGENT_LIMITS } from "./agent-limits.ts";
import {
  validateAiAgentConfig,
  validateAiMemoryConfig,
  validateAiModelConfig,
  validateAiToolConfig,
  validateChatTriggerConfig,
} from "./agent-validation.ts";

describe("agent runtime validation", () => {
  it("accepts valid agent, model, memory, tool, and chat trigger configs", () => {
    const agent = validateAiAgentConfig(validAgent());
    assert.equal(agent.type, "ai-agent");
    assert.equal(agent.executionMode, "loop");
    assert.equal(validateAiModelConfig(validModel()).type, "ai-model");
    assert.equal(validateAiMemoryConfig(validMemory()).type, "ai-memory");
    assert.equal(validateAiToolConfig(validTool()).type, "ai-tool");
    assert.equal(validateChatTriggerConfig(validChatTrigger()).type, "chat");
  });

  it("applies the safe default timeout when an AI tool omits timeoutMs", () => {
    const { timeoutMs: _timeoutMs, ...toolWithoutTimeout } = validTool();

    const tool = validateAiToolConfig(toolWithoutTimeout);

    assert.equal(tool.timeoutMs, AGENT_LIMITS.defaultToolTimeoutMs);
  });

  it("accepts valid AI model configs with plugin id and adapter", () => {
    const model = validateAiModelConfig({
      ...validModel(),
      pluginId: "generic-ai",
      adapter: "openai-compatible",
    });

    assert.equal(model.pluginId, "generic-ai");
    assert.equal(model.adapter, "openai-compatible");
  });

  it("accepts generic AI model adapter configs", () => {
    const model = validateAiModelConfig({
      ...validModel(),
      pluginId: "fabric-ollama",
      adapter: "generic",
      model: "llama3.2",
      baseUrl: "http://localhost:11434/v1",
      credentialId: undefined,
    });

    assert.equal(model.pluginId, "fabric-ollama");
    assert.equal(model.adapter, "generic");
    assert.equal(model.baseUrl, "http://localhost:11434/v1");
  });

  it("accepts native Ollama AI model adapter configs", () => {
    const model = validateAiModelConfig({
      ...validModel(),
      pluginId: "fabric-ollama",
      adapter: "ollama",
      model: "llama3.2",
      baseUrl: "http://localhost:11434",
      credentialId: undefined,
    });

    assert.equal(model.pluginId, "fabric-ollama");
    assert.equal(model.adapter, "ollama");
    assert.equal(model.baseUrl, "http://localhost:11434");
  });

  it("defaults AI model temperature when the editor fallback was not persisted", () => {
    const { temperature: _temperature, ...config } = validModel();

    const model = validateAiModelConfig(config);

    assert.equal(model.temperature, 0.2);
  });

  it("normalizes legacy OpenAI model configs", () => {
    const model = validateAiModelConfig(legacyModel("openai"));

    assert.equal(model.pluginId, "openai");
    assert.equal(model.adapter, "openai-compatible");
    assert.equal(model.baseUrl, undefined);
    assert.equal("provider" in model, false);
  });

  it("preserves legacy OpenAI base URL when configured", () => {
    const model = validateAiModelConfig({
      ...legacyModel("openai"),
      baseUrl: "https://proxy.example.test/v1",
    });

    assert.equal(model.pluginId, "openai");
    assert.equal(model.adapter, "openai-compatible");
    assert.equal(model.baseUrl, "https://proxy.example.test/v1");
    assert.equal("provider" in model, false);
  });

  it("normalizes legacy OpenRouter model configs with the OpenRouter base URL", () => {
    const model = validateAiModelConfig(legacyModel("openrouter"));

    assert.equal(model.pluginId, "openrouter");
    assert.equal(model.adapter, "openai-compatible");
    assert.equal(model.baseUrl, "https://openrouter.ai/api/v1");
    assert.equal("provider" in model, false);
  });

  it("preserves legacy OpenRouter base URL when configured", () => {
    const model = validateAiModelConfig({
      ...legacyModel("openrouter"),
      baseUrl: "https://custom-openrouter.example.test/v1",
    });

    assert.equal(model.pluginId, "openrouter");
    assert.equal(model.adapter, "openai-compatible");
    assert.equal(model.baseUrl, "https://custom-openrouter.example.test/v1");
    assert.equal("provider" in model, false);
  });

  it("rejects unsupported AI model adapters", () => {
    assert.throws(
      () =>
        validateAiModelConfig({
          ...validModel(),
          adapter: "hardcoded-openai",
        }),
      /adapter/i,
    );
  });

  it("rejects new AI model configs without a plugin id", () => {
    const { pluginId: _pluginId, ...model } = validModel();

    assert.throws(() => validateAiModelConfig(model), /pluginId/i);
  });

  it("rejects prompts over the configured limit", () => {
    assert.throws(
      () =>
        validateAiAgentConfig({
          ...validAgent(),
          prompt: "x".repeat(AGENT_LIMITS.maxPromptChars + 1),
        }),
      /prompt/i,
    );
  });

  it("accepts user-defined agent iteration and tool call limits above defaults", () => {
    const agent = validateAiAgentConfig({
      ...validAgent(),
      maxToolCalls: 30,
      maxRetriesPerTool: 100,
    });

    assert.equal(agent.maxToolCalls, 30);
    assert.equal(agent.maxRetriesPerTool, 100);
  });

  it("defaults agent max retries per tool to three", () => {
    const agent = validateAiAgentConfig(validAgent());

    assert.equal(agent.maxRetriesPerTool, 3);
  });

  it("rejects agent max retries per tool above one hundred", () => {
    assert.throws(
      () =>
        validateAiAgentConfig({
          ...validAgent(),
          maxRetriesPerTool: 101,
        }),
      /maxRetriesPerTool/i,
    );
  });

  it("rejects the removed plan execution mode", () => {
    assert.throws(() => validateAiAgentConfig({
      ...validAgent(),
      executionMode: "plan",
    }));
  });

  it("rejects tool side effects outside the allowlist", () => {
    assert.throws(
      () =>
        validateAiToolConfig({
          ...validTool(),
          sideEffect: "format-disk",
        }),
      /sideEffect/i,
    );
  });

  it("rejects invalid chat trigger slugs", () => {
    assert.throws(
      () =>
        validateChatTriggerConfig({
          ...validChatTrigger(),
          chatSlug: "Bad Slug!",
        }),
      /chatSlug/i,
    );
  });

  it("rejects output schemas deeper than the JSON depth limit", () => {
    assert.throws(
      () =>
        validateAiAgentConfig({
          ...validAgent(),
          outputMode: "json",
          outputSchema: nestedSchema(AGENT_LIMITS.maxJsonDepth + 1),
        }),
      /outputSchema/i,
    );
  });
});

function validAgent() {
  return {
    type: "ai-agent",
    name: "AI Agent",
    prompt: "You are a helpful workflow agent.",
    maxToolCalls: 12,
    timeoutMs: AGENT_LIMITS.defaultAgentTimeoutMs,
    requireApprovalForSideEffects: ["write", "delete"],
    outputMode: "text",
  };
}

function validModel() {
  return {
    type: "ai-model",
    name: "Generic AI Model",
    pluginId: "openai",
    adapter: "openai-compatible",
    model: "gpt-4.1-mini",
    temperature: 0.2,
    maxTokens: 2048,
    credentialId: "cred_openai",
  };
}

function legacyModel(provider: "openai" | "openrouter") {
  return {
    type: "ai-model",
    name: "Legacy AI Model",
    provider,
    model: "gpt-4.1-mini",
    temperature: 0.2,
    maxTokens: 2048,
    credentialId: `cred_${provider}`,
  };
}

function validMemory() {
  return {
    type: "ai-memory",
    name: "Session Memory",
    scope: "session",
    readEnabled: true,
    writeEnabled: false,
    maxRetrievedMemories: 6,
    maxMemoryChars: 2000,
  };
}

function validTool() {
  return {
    type: "ai-tool",
    name: "GitHub Create Issue",
    pluginId: "github",
    methodId: "createIssue",
    timeoutMs: AGENT_LIMITS.defaultToolTimeoutMs,
    requiresApproval: true,
    sideEffect: "write",
    inputDefaults: { owner: "acme" },
  };
}

function validChatTrigger() {
  return {
    type: "chat",
    chatSlug: "support-agent",
    title: "Support Agent",
    authMode: "profile",
    sessionMode: "resume-by-session-id",
    allowedOrigins: ["http://localhost:23802"],
    rateLimitPerMinute: 20,
  };
}

function nestedSchema(depth: number): Record<string, unknown> {
  let schema: Record<string, unknown> = { type: "string" };
  for (let index = 0; index < depth; index++) {
    schema = {
      type: "object",
      properties: {
        child: schema,
      },
    };
  }
  return schema;
}
