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

  it("passes plugin metadata into graph tools", async () => {
    const graphTools: Array<{ pluginId?: string; pluginName?: string }> = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      toolRegistry: {
        listAvailableTools: () => [],
        resolveConfiguredTools: () => [
          toolDefinition("discord_send_message", {
            pluginId: "discord",
            pluginName: "Discord",
          }),
        ],
      },
      graphBuilder: (input) => {
        graphTools.push(...input.tools as Array<{ pluginId?: string; pluginName?: string }>);
        return {
          async invoke() {
            return successResult("ok");
          },
        };
      },
    });

    await runner.run({ ...runInput(), tools: [toolConfig({ pluginId: "discord" })] });

    assert.deepEqual(graphTools.map((tool) => ({
      pluginId: tool.pluginId,
      pluginName: tool.pluginName,
    })), [{ pluginId: "discord", pluginName: "Discord" }]);
  });

  it("removes configured default inputs from graph tool required schema", async () => {
    const graphTools: Array<{ inputSchema?: any; description?: string }> = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      toolRegistry: {
        listAvailableTools: () => [],
        resolveConfiguredTools: () => [
          toolDefinition("discord_send_message", {
            inputSchema: {
              type: "object",
              properties: {
                channelId: { type: "string" },
                content: { type: "string" },
              },
              required: ["channelId", "content"],
            },
          }),
        ],
      },
      graphBuilder: (input) => {
        graphTools.push(...input.tools as Array<{ inputSchema?: any; description?: string }>);
        return {
          async invoke() {
            return successResult("ok");
          },
        };
      },
    });

    await runner.run({
      ...runInput(),
      tools: [toolConfig({ inputDefaults: { channelId: "1234567890" } })],
    });

    assert.deepEqual(graphTools[0]?.inputSchema?.required, ["content"]);
    assert.match(graphTools[0]?.description ?? "", /channelId is already configured/i);
  });

  it("does not create a checkpointer for a stateless run even when a session id exists", async () => {
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

    assert.deepEqual(createdFor, []);
  });

  it("creates a checkpointer for SQLite short-term memory only when a session id exists", async () => {
    const createdFor: string[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      graphBuilder: fakeGraphBuilder(),
      checkpointerFactory: async (input) => {
        createdFor.push(input.sessionId);
        return { thread: input.sessionId };
      },
    });

    await runner.run({ ...runInput(), memory: memoryConfig({ adapter: "sailor-internal", scope: "session" }) });
    await runner.run({
      ...runInput(),
      sessionId: "chat_session_1",
      memory: memoryConfig({ adapter: "sailor-internal", scope: "session" }),
    });

    assert.deepEqual(createdFor, ["chat_session_1"]);
  });

  it("does not create a SQLite checkpointer for plugin-backed long-term memory", async () => {
    const createdFor: string[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      graphBuilder: fakeGraphBuilder(),
      pluginMemoryExecutor: async () => [],
      checkpointerFactory: async (input) => {
        createdFor.push(input.sessionId);
        return { thread: input.sessionId };
      },
    });

    await runner.run({
      ...runInput(),
      sessionId: "chat_session_1",
      memory: pluginMemoryConfig(),
    });

    assert.deepEqual(createdFor, []);
  });

  it("does not read or write long-term records for SQLite short-term memory", async () => {
    const events: string[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      graphBuilder: fakeGraphBuilder({ output: "safe memory" }),
      emitEvent: (event) => events.push(event.type),
    });

    await runner.run({
      ...runInput(),
      sessionId: "chat_session_1",
      memory: memoryConfig({
        adapter: "sailor-internal",
        scope: "profile",
        readEnabled: true,
        writeEnabled: true,
      }),
    });

    assert.deepEqual(events, ["agent:start", "agent:config-snapshot", "agent:end"]);
  });

  it("reads and writes plugin-backed memory through configured plugin methods", async () => {
    const calls: Array<{ pluginId: string; methodId: string; params: Record<string, unknown> }> = [];
    const contextMessages: string[] = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
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
      memory: pluginMemoryConfig({ writeEnabled: true }),
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

    assert.deepEqual(events, ["agent:start", "agent:config-snapshot", "agent:end"]);
  });

  it("emits inherited workflow input for connected config node snapshots", async () => {
    const events: Array<{ type: string; payload?: unknown }> = [];
    const runner = new AgentRunner({
      modelRegistry: fakeModelRegistry(),
      graphBuilder: fakeGraphBuilder(),
      emitEvent: (event) => events.push(event),
    });

    await runner.run({
      ...runInput(),
      sessionId: "chat_session_1",
      userId: "user_1",
      triggerPayload: { text: "hello", channelId: "channel_1" },
    });

    assert.deepEqual(events[1], {
      type: "agent:config-snapshot",
      payload: {
        input: {
          triggerPayload: { text: "hello", channelId: "channel_1" },
          userMessage: "hello",
          sessionId: "chat_session_1",
          userId: "user_1",
        },
      },
    });
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
      "agent:config-snapshot",
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

function pluginMemoryConfig(overrides: Partial<AiMemoryNodeConfig> = {}): AiMemoryNodeConfig {
  return memoryConfig({
    adapter: "plugin-memory-store",
    pluginId: "sailor-postgresql",
    searchMethodId: "searchAgentMemory",
    putMethodId: "putAgentMemory",
    ...overrides,
  });
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
