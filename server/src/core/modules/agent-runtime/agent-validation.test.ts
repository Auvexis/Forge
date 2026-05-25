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
    assert.equal(validateAiAgentConfig(validAgent()).type, "ai-agent");
    assert.equal(validateAiModelConfig(validModel()).type, "ai-model");
    assert.equal(validateAiMemoryConfig(validMemory()).type, "ai-memory");
    assert.equal(validateAiToolConfig(validTool()).type, "ai-tool");
    assert.equal(validateChatTriggerConfig(validChatTrigger()).type, "chat");
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

  it("rejects agent iteration and tool call limits above policy", () => {
    assert.throws(
      () =>
        validateAiAgentConfig({
          ...validAgent(),
          maxIterations: AGENT_LIMITS.maxIterations + 1,
        }),
      /maxIterations/i,
    );
    assert.throws(
      () =>
        validateAiAgentConfig({
          ...validAgent(),
          maxToolCalls: AGENT_LIMITS.maxToolCalls + 1,
        }),
      /maxToolCalls/i,
    );
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
    maxIterations: 8,
    maxToolCalls: 12,
    timeoutMs: AGENT_LIMITS.defaultAgentTimeoutMs,
    requireApprovalForSideEffects: ["write", "delete"],
    outputMode: "text",
  };
}

function validModel() {
  return {
    type: "ai-model",
    name: "OpenAI Model",
    provider: "openai",
    model: "gpt-4.1-mini",
    temperature: 0.2,
    maxTokens: 2048,
    credentialId: "cred_openai",
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
