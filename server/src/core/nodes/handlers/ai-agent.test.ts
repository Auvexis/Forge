import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { AgentRuntimeService } from "../../modules/agent-runtime/agent-runtime-service.ts";
import type { AgentRunInput } from "../../modules/agent-runtime/agent-types.ts";
import { createUtilityNodeRegistry } from "../registry.ts";
import type { NodeHandlerInput, WorkflowExecutionContext } from "../types.ts";
import type { WorkflowItem, WorkflowNode } from "../../../shared/models/workflow-types.ts";

describe("AI workflow node handlers", () => {
  const originalRunAgent = AgentRuntimeService.runAgent;

  afterEach(() => {
    AgentRuntimeService.runAgent = originalRunAgent;
  });

  it("registers AI utility node handlers", () => {
    const registry = createUtilityNodeRegistry();

    assert.equal(registry.has("ai-agent"), true);
    assert.equal(registry.has("ai-model"), true);
    assert.equal(registry.has("ai-memory"), true);
    assert.equal(registry.has("ai-tool"), true);
  });

  it("executes model, memory, and tool handlers as configuration-only metadata", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture();
    const context = contextFixture();

    for (const nodeId of ["model", "memory", "tool"] as const) {
      const node = workflow.nodes[nodeId];
      const output = await registry.get(node.type).execute(handlerInput(nodeId, node, workflow, context));

      assert.equal(output.type, node.type);
      assert.equal(output.name, node.name);
      if (nodeId === "model") {
        assert.equal(output.pluginId, "openai");
        assert.equal(output.adapter, "openai-compatible");
        assert.equal("provider" in output, false);
      }
    }
  });

  it("normalizes legacy OpenRouter model handler output with the OpenRouter base URL", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        model: {
          type: "ai-model",
          name: "OpenRouter Model",
          provider: "openrouter",
          model: "openai/gpt-test",
          temperature: 0,
        } as any,
      },
    });
    const output = await registry
      .get("ai-model")
      .execute(handlerInput("model", workflow.nodes.model, workflow, contextFixture()));

    assert.equal(output.pluginId, "openrouter");
    assert.equal(output.adapter, "openai-compatible");
    assert.equal(output.baseUrl, "https://openrouter.ai/api/v1");
    assert.equal("provider" in output, false);
  });

  it("finds connected model, memory, and tool nodes for the AI Agent", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture();
    const context = contextFixture();
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "agent output",
        toolCallCount: 1,
        iterationCount: 2,
      };
    };

    const result = await registry
      .get("ai-agent")
      .execute(handlerInput("agent", workflow.nodes.agent, workflow, context));

    assert.equal(result.output, "agent output");
    assert.ok(received);
    const runCall = received as AgentRunInput;
    assert.equal(runCall.model.pluginId, "openai");
    assert.equal(runCall.model.adapter, "openai-compatible");
    assert.equal(runCall.model.model, "gpt-test");
    assert.equal(runCall.agent.agentDisplayName, "Support Agent");
    assert.equal(runCall.agent.agentEmoji, "\u{1F916}");
    assert.equal(runCall.agent.agentDescription, "Answers support questions.");
    assert.equal(runCall.memory?.scope, "profile");
    assert.equal(runCall.tools.length, 1);
    assert.equal(runCall.tools[0].methodId, "lookup");
  });

  it("prefers plugin model identity over legacy provider on mixed AI model nodes", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        model: {
          type: "ai-model",
          name: "Ollama Model",
          provider: "openai",
          pluginId: "sailor-ollama",
          adapter: "generic",
          model: "llama3.2",
          temperature: 0,
          baseUrl: "http://localhost:11434/v1",
        } as any,
      },
    });
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };

    await registry
      .get("ai-agent")
      .execute(handlerInput("agent", workflow.nodes.agent, workflow, contextFixture()));

    assert.ok(received);
    const runCall = received as AgentRunInput;
    assert.equal(runCall.model.pluginId, "sailor-ollama");
    assert.equal(runCall.model.adapter, "generic");
    assert.equal(runCall.model.baseUrl, "http://localhost:11434/v1");
  });

  it("normalizes legacy OpenRouter model nodes with the OpenRouter base URL", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        model: {
          type: "ai-model",
          name: "OpenRouter Model",
          provider: "openrouter",
          model: "openai/gpt-test",
          temperature: 0,
        } as any,
      },
    });
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };

    await registry
      .get("ai-agent")
      .execute(handlerInput("agent", workflow.nodes.agent, workflow, contextFixture()));

    assert.ok(received);
    const runCall = received as AgentRunInput;
    assert.equal(runCall.model.pluginId, "openrouter");
    assert.equal(runCall.model.adapter, "openai-compatible");
    assert.equal(runCall.model.baseUrl, "https://openrouter.ai/api/v1");
  });

  it("preserves custom base URL on legacy OpenRouter model nodes", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        model: {
          type: "ai-model",
          name: "Custom OpenRouter Model",
          provider: "openrouter",
          model: "openai/gpt-test",
          temperature: 0,
          baseUrl: "https://proxy.example.com/v1",
        } as any,
      },
    });
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };

    await registry
      .get("ai-agent")
      .execute(handlerInput("agent", workflow.nodes.agent, workflow, contextFixture()));

    assert.ok(received);
    const runCall = received as AgentRunInput;
    assert.equal(runCall.model.pluginId, "openrouter");
    assert.equal(runCall.model.adapter, "openai-compatible");
    assert.equal(runCall.model.baseUrl, "https://proxy.example.com/v1");
  });

  it("passes trigger payload and workflow context to AgentRuntimeService.runAgent", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture();
    const context = contextFixture({
      trigger: {
        profileId: "profile_1",
        userId: "user_1",
        message: "Hello agent",
        sessionId: "chat_session_1",
        messages: [
          { role: "user", content: "Boa noite" },
          { role: "assistant", content: { text: "Boa noite! Como posso ajudar?" } },
          { role: "assistant", content: { pending: true } },
        ],
        metadata: { origin: "test" },
      },
      _executionId: "exec_1",
    });
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };

    await registry
      .get("ai-agent")
      .execute(handlerInput("agent", workflow.nodes.agent, workflow, context, "exec_1"));

    assert.ok(received);
    const runCall = received as AgentRunInput;
    assert.equal(runCall.profileId, "profile_1");
    assert.equal(runCall.workflowId, "workflow_1");
    assert.equal(runCall.executionId, "exec_1");
    assert.equal(runCall.nodeId, "agent");
    assert.equal(runCall.sessionId, "chat_session_1");
    assert.equal(runCall.userId, "user_1");
    assert.equal(runCall.userMessage, "Hello agent");
    assert.deepEqual(runCall.contextMessages, [
      { role: "user", content: "Boa noite" },
      { role: "assistant", content: "Boa noite! Como posso ajudar?" },
    ]);
    assert.deepEqual(runCall.triggerPayload, context.trigger);
  });

  it("does not forward trigger history without a connected memory node", async () => {
    const registry = createUtilityNodeRegistry();
    const fixture = workflowFixture();
    const { memory: _memory, ...nodes } = fixture.nodes;
    const workflow = workflowFixture({
      nodes,
      edges: fixture.edges.filter((edge) => edge.source !== "memory"),
    });
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };

    await registry
      .get("ai-agent")
      .execute(handlerInput("agent", workflow.nodes.agent, workflow, contextFixture({
        trigger: {
          profileId: "profile_1",
          message: "Hello",
          sessionId: "chat_session_1",
          messages: [{ role: "user", content: "Previous message" }],
        },
      })));

    assert.ok(received);
    assert.equal((received as AgentRunInput).contextMessages, undefined);
  });

  it("does not forward chat transcript to plugin-backed long-term memory", async () => {
    const registry = createUtilityNodeRegistry();
    const fixture = workflowFixture();
    const memory = fixture.nodes.memory;
    if (memory.type !== "ai-memory") {
      throw new Error("Invalid AI memory fixture");
    }
    const workflow = workflowFixture({
      nodes: {
        ...fixture.nodes,
        memory: {
          ...memory,
          adapter: "plugin-memory-store",
          pluginId: "sailor-postgresql",
          searchMethodId: "searchAgentMemory",
          putMethodId: "putAgentMemory",
        },
      },
    });
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };

    await registry
      .get("ai-agent")
      .execute(handlerInput("agent", workflow.nodes.agent, workflow, contextFixture({
        trigger: {
          profileId: "profile_1",
          message: "Hello",
          sessionId: "chat_session_1",
          messages: [{ role: "user", content: "Previous message" }],
        },
      })));

    assert.ok(received);
    assert.equal((received as AgentRunInput).contextMessages, undefined);
  });

  it("does not forward SQLite history when the trigger has no session id", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture();
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };

    await registry
      .get("ai-agent")
      .execute(handlerInput("agent", workflow.nodes.agent, workflow, contextFixture({
        trigger: {
          profileId: "profile_1",
          message: "Hello",
          messages: [{ role: "user", content: "Previous message" }],
        },
      })));

    assert.ok(received);
    assert.equal((received as AgentRunInput).contextMessages, undefined);
  });

  it("interpolates workflow context into the agent prompt and configured tool inputs", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture();
    const agent = workflow.nodes.agent;
    const tool = workflow.nodes.tool;
    if (agent.type !== "ai-agent" || tool.type !== "ai-tool") {
      throw new Error("Invalid AI workflow fixture");
    }
    agent.prompt = "Help {{ trigger.customer }} using {{ variables.course }} from {{ env.CLASSROOM }}";
    tool.descriptionOverride = "Send the answer for {{ trigger.customer }}";
    tool.inputDefaults = {
      channelId: "{{ env.DISCORD_CHANNEL }}",
      summary: "{{ steps.prepare.output.summary }}",
    };
    const context = contextFixture({
      trigger: { customer: "Andre", message: "Hello" },
      steps: { prepare: { output: { summary: "if-else" } } },
      variables: { course: "Programming" },
      env: { CLASSROOM: "Night Class", DISCORD_CHANNEL: "channel-1" },
    });
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };

    await registry
      .get("ai-agent")
      .execute(handlerInput("agent", agent, workflow, context));

    assert.ok(received);
    const runCall = received as AgentRunInput;
    assert.equal(runCall.agent.prompt, "Help Andre using Programming from Night Class");
    assert.equal(runCall.tools[0].descriptionOverride, "Send the answer for Andre");
    assert.deepEqual(runCall.tools[0].inputDefaults, {
      channelId: "channel-1",
      summary: "if-else",
    });
  });

  it("accepts webhook-style trigger payloads as agent input", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture();
    let received: AgentRunInput | null = null;
    AgentRuntimeService.runAgent = async (input) => {
      received = input;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };

    await registry
      .get("ai-agent")
      .execute(handlerInput("agent", workflow.nodes.agent, workflow, contextFixture({
        trigger: { body: { text: "Webhook lesson request" } },
      })));

    assert.ok(received);
    assert.equal((received as AgentRunInput).userMessage, "Webhook lesson request");
  });

  it("fails clearly when no model node is connected", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture({
      edges: [{ id: "trigger-agent", source: "trigger", target: "agent" }],
    });

    await assert.rejects(
      registry
        .get("ai-agent")
        .execute(handlerInput("agent", workflow.nodes.agent, workflow, contextFixture())),
      /AI Agent requires one connected AI Model node/i,
    );
  });
});

function handlerInput(
  nodeId: string,
  node: WorkflowNode,
  workflow: WorkflowItem,
  context: WorkflowExecutionContext,
  executionId = "exec_1",
): NodeHandlerInput {
  return {
    nodeId,
    node,
    workflow,
    context,
    edges: workflow.edges,
    executionId,
    services: {
      executeNode: async () => undefined,
      executeWorkflow: async () => undefined,
      getWorkflowById: () => null,
      emitInternalEvent: async () => ({ triggered: [] }),
      resolvePendingWebhookResponse: () => false,
      emitNodeStart: () => undefined,
      emitNodeSuccess: () => undefined,
      emitNodeFailure: () => undefined,
    },
  };
}

function contextFixture(overrides: Partial<WorkflowExecutionContext> = {}): WorkflowExecutionContext {
  return {
    _workflowId: "workflow_1",
    _executionId: "exec_1",
    trigger: {
      profileId: "profile_1",
      message: "Hi",
      sessionId: "chat_session_1",
    },
    steps: {},
    variables: {},
    ...overrides,
  };
}

function workflowFixture(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    metadata: {
      id: "workflow_1",
      name: "Agent workflow",
      version: "1",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: new Date(0).toISOString(),
    },
    trigger: { type: "manual" },
    nodes: {
      trigger: { type: "trigger", name: "Manual", trigger: { type: "manual" } },
      agent: {
        type: "ai-agent",
        name: "Agent",
        agentDisplayName: "Support Agent",
        agentEmoji: "\u{1F916}",
        agentDescription: "Answers support questions.",
        prompt: "You are helpful.",
        maxIterations: 4,
        maxToolCalls: 4,
        timeoutMs: 30000,
        requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
        outputMode: "text",
      },
      model: {
        type: "ai-model",
        name: "Model",
        pluginId: "openai",
        adapter: "openai-compatible",
        model: "gpt-test",
        temperature: 0,
      },
      memory: {
        type: "ai-memory",
        name: "Memory",
        scope: "profile",
        readEnabled: true,
        writeEnabled: false,
        maxRetrievedMemories: 4,
        maxMemoryChars: 4000,
      },
      tool: {
        type: "ai-tool",
        name: "Lookup",
        pluginId: "plugin",
        methodId: "lookup",
        timeoutMs: 30000,
        requiresApproval: false,
        sideEffect: "read",
      },
    },
    edges: [
      { id: "trigger-agent", source: "trigger", target: "agent" },
      { id: "model-agent", source: "model", target: "agent" },
      { id: "memory-agent", source: "memory", target: "agent" },
      { id: "tool-agent", source: "tool", target: "agent" },
    ],
    ...overrides,
  };
}
