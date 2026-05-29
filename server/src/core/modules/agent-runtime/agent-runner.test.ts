import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "./agent-errors.ts";
import type { SailorAgentToolDefinition } from "./plugin-tool-adapter.ts";
import type {
  AgentRunInput,
  AgentRunResult,
  AiAgentNodeConfig,
  AiMemoryNodeConfig,
  AiModelNodeConfig,
  AiToolNodeConfig,
} from "./agent-types.ts";
import { AgentRunner } from "./agent-runner.ts";

describe("agent runner", () => {
  it("validates run input before execution", async () => {
    let modelResolved = false;
    const runner = new AgentRunner({
      modelRegistry: {
        async createChatModel() {
          modelResolved = true;
          return fakeModel("unused");
        },
      },
      graphBuilder: fakeGraphBuilder(),
    });

    await assert.rejects(
      runner.run({ ...runInput(), agent: agentConfig({ prompt: "" }) }),
      /agent config/i,
    );
    assert.equal(modelResolved, false);
  });

  it("resolves model and configured tools before graph execution", async () => {
    const calls: string[] = [];
    const runner = new AgentRunner({
      modelRegistry: {
        async createChatModel(config) {
          calls.push(`model:${config.model}`);
          return fakeModel("ok");
        },
      },
      toolRegistry: {
        listAvailableTools: () => [],
        resolveConfiguredTools(configs) {
          calls.push(`tools:${configs.length}`);
          return [toolDefinition("lookup")];
        },
      },
      graphBuilder: fakeGraphBuilder(),
    });

    const result = await runner.run({ ...runInput(), tools: [toolConfig()] });

    assert.equal(result.status, "success");
    assert.deepEqual(calls, ["model:gpt-test", "tools:1"]);
  });

  it("creates a checkpointer only when a session id exists", async () => {
    const createdFor: string[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      graphBuilder: fakeGraphBuilder(),
      checkpointerFactory: async (input) => {
        createdFor.push(input.sessionId);
        return { thread: input.sessionId };
      },
    });

    await runner.run(runInput());
    await runner.run({ ...runInput(), sessionId: "chat_session_1" });

    assert.deepEqual(createdFor, ["chat_session_1"]);
  });

  it("reads long-term memory before the model call", async () => {
    const contextCounts: number[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      memoryStore: {
        search: (input) => {
          assert.equal(input.namespace, "profile:profile_1");
          return [{ key: "preference", value: "likes concise answers" }];
        },
        put: () => undefined,
      },
      graphBuilder: (input) => ({
        async invoke(run) {
          contextCounts.push(run.contextMessages?.length ?? 0);
          return successResult("ok");
        },
      }),
    });

    await runner.run({ ...runInput(), memory: memoryConfig({ scope: "profile" }) });

    assert.deepEqual(contextCounts, [1]);
  });

  it("passes short-term chat history after long-term memory context", async () => {
    const contextMessages: Array<Array<{ role: string; content: string }>> = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      memoryStore: {
        search: () => [{ key: "preference", value: "likes concise answers" }],
        put: () => undefined,
      },
      graphBuilder: () => ({
        async invoke(run) {
          contextMessages.push(run.contextMessages ?? []);
          return successResult("ok");
        },
      }),
    });

    await runner.run({
      ...runInput(),
      memory: memoryConfig({ scope: "profile" }),
      contextMessages: [
        { role: "user", content: "Boa noite" },
        { role: "assistant", content: "Boa noite! Como posso ajudar?" },
      ],
    });

    assert.deepEqual(contextMessages[0], [
      { role: "system", content: "Memory preference: likes concise answers" },
      { role: "user", content: "Boa noite" },
      { role: "assistant", content: "Boa noite! Como posso ajudar?" },
    ]);
  });

  it("writes long-term memory only through policy", async () => {
    const writes: unknown[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      memoryStore: {
        search: () => [],
        put: (input) => {
          writes.push(input.value);
          return undefined;
        },
      },
      graphBuilder: fakeGraphBuilder({ output: "safe memory" }),
    });

    await runner.run({ ...runInput(), memory: memoryConfig({ writeEnabled: true }) });
    assert.deepEqual(writes, ["safe memory"]);

    const secretRunner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      memoryStore: {
        search: () => [],
        put: () => {
          throw new Error("put must not be reached");
        },
      },
      graphBuilder: fakeGraphBuilder({ output: "apiKey=sk-live-secret-value" }),
    });

    await assert.rejects(
      secretRunner.run({ ...runInput(), memory: memoryConfig({ writeEnabled: true }) }),
      /secret/i,
    );
  });

  it("reads and writes plugin-backed memory through configured plugin methods", async () => {
    const calls: Array<{ pluginId: string; methodId: string; params: Record<string, unknown> }> = [];
    const contextMessages: string[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      memoryStore: {
        search: () => {
          throw new Error("internal memory store should not be used");
        },
        put: () => {
          throw new Error("internal memory store should not be used");
        },
      },
      pluginMemoryExecutor: async (pluginId: string, methodId: string, params: Record<string, unknown>) => {
        calls.push({ pluginId, methodId, params });
        if (methodId === "searchAgentMemory") {
          return [{ key: "tone", value: "friendly" }];
        }
        return { ok: true };
      },
      graphBuilder: () => ({
        async invoke(run) {
          contextMessages.push(run.contextMessages?.[0]?.content ?? "");
          return successResult("store this memory");
        },
      }),
    });

    await runner.run({
      ...runInput(),
      memory: memoryConfig({
        adapter: "plugin-memory-store",
        pluginId: "sailor-postgresql",
        searchMethodId: "searchAgentMemory",
        putMethodId: "putAgentMemory",
        writeEnabled: true,
      } as Partial<AiMemoryNodeConfig>),
    });

    assert.equal(contextMessages[0], "Memory tone: friendly");
    assert.equal(calls[0].pluginId, "sailor-postgresql");
    assert.equal(calls[0].methodId, "searchAgentMemory");
    assert.deepEqual(calls[0].params, {
      profileId: "profile_1",
      namespace: "profile:profile_1",
      limit: 4,
    });
    assert.equal(calls[1].pluginId, "sailor-postgresql");
    assert.equal(calls[1].methodId, "putAgentMemory");
    assert.equal(calls[1].params.profileId, "profile_1");
    assert.equal(calls[1].params.namespace, "profile:profile_1");
    assert.equal(calls[1].params.key, "agent:agent_1:last-output");
    assert.equal(calls[1].params.value, "store this memory");
  });

  it("does not block the model just because a configured tool may require approval", async () => {
    let graphInvoked = false;
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      toolRegistry: {
        listAvailableTools: () => [],
        resolveConfiguredTools: () => [toolDefinition("send_email", { requiresApproval: true })],
      },
      graphBuilder: () => ({
        async invoke() {
          graphInvoked = true;
          return successResult("No email needed.");
        },
      }),
    });

    const result = await runner.run({ ...runInput(), tools: [toolConfig({ requiresApproval: true })] });

    assert.equal(graphInvoked, true);
    assert.equal(result.status, "success");
    assert.equal(result.output, "No email needed.");
  });

  it("emits agent:start and agent:end around successful runs", async () => {
    const events: string[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      graphBuilder: fakeGraphBuilder(),
      emitEvent: (event) => events.push(event.type),
    });

    await runner.run(runInput());

    assert.deepEqual(events, ["agent:start", "agent:end"]);
  });

  it("forwards graph stream delta events before agent:end", async () => {
    const events: string[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      graphBuilder: (input) => ({
        async invoke() {
          input.onEvent?.({ type: "agent:output-delta", payload: { delta: "hel" } });
          input.onEvent?.({ type: "agent:output-delta", payload: { delta: "lo" } });
          return successResult("hello");
        },
      }),
      emitEvent: (event) => events.push(event.type),
    });

    await runner.run(runInput());

    assert.deepEqual(events, [
      "agent:start",
      "agent:output-delta",
      "agent:output-delta",
      "agent:end",
    ]);
  });

  it("converts thrown errors into AgentRuntimeError", async () => {
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      graphBuilder: () => ({
        async invoke() {
          throw new Error("provider exploded");
        },
      }),
    });

    await assert.rejects(
      runner.run(runInput()),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_RUN_FAILED" &&
        /provider exploded/.test(error.message) &&
        /provider exploded/.test(error.publicMessage),
    );
  });
});

function runInput(overrides: Partial<AgentRunInput> = {}): AgentRunInput {
  return {
    profileId: "profile_1",
    workflowId: "workflow_1",
    executionId: "execution_1",
    nodeId: "agent_1",
    userMessage: "hello",
    triggerPayload: {},
    agent: agentConfig(),
    model: modelConfig(),
    tools: [],
    ...overrides,
  };
}

function agentConfig(overrides: Partial<AiAgentNodeConfig> = {}): AiAgentNodeConfig {
  return {
    type: "ai-agent",
    name: "Agent",
    prompt: "You are helpful.",
    maxIterations: 4,
    maxToolCalls: 4,
    timeoutMs: 30000,
    requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
    outputMode: "text",
    ...overrides,
  };
}

function modelConfig(overrides: Partial<AiModelNodeConfig> = {}): AiModelNodeConfig {
  return {
    type: "ai-model",
    name: "Model",
    pluginId: "openai",
    adapter: "openai-compatible",
    model: "gpt-test",
    temperature: 0,
    ...overrides,
  };
}

function memoryConfig(overrides: Partial<AiMemoryNodeConfig> = {}): AiMemoryNodeConfig {
  return {
    type: "ai-memory",
    name: "Memory",
    scope: "profile",
    readEnabled: true,
    writeEnabled: false,
    maxRetrievedMemories: 4,
    maxMemoryChars: 4000,
    ...overrides,
  };
}

function toolConfig(overrides: Partial<AiToolNodeConfig> = {}): AiToolNodeConfig {
  return {
    type: "ai-tool",
    name: "Lookup",
    pluginId: "plugin",
    methodId: "lookup",
    timeoutMs: 30000,
    requiresApproval: false,
    sideEffect: "read",
    ...overrides,
  };
}

function toolDefinition(
  name: string,
  overrides: Partial<SailorAgentToolDefinition> = {},
): SailorAgentToolDefinition {
  return {
    name,
    description: name,
    pluginId: "plugin",
    methodId: name,
    inputSchema: { type: "object" },
    sideEffect: "read",
    requiresApproval: false,
    timeoutMs: 30000,
    ...overrides,
  };
}

function fakeModel(output: string) {
  return {
    async invoke() {
      return { content: output };
    },
  };
}

function fakeModelRegistry() {
  return {
    async createChatModel() {
      return fakeModel("ok");
    },
  };
}

function fakeGraphBuilder(overrides: Partial<AgentRunResult> = {}) {
  return () => ({
    async invoke() {
      return successResult("ok", overrides);
    },
  });
}

function successResult(output: string, overrides: Partial<AgentRunResult> = {}): AgentRunResult {
  return {
    status: "success",
    output,
    toolCallCount: 0,
    iterationCount: 1,
    ...overrides,
  };
}
