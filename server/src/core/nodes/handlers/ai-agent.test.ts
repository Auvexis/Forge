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
    assert.equal(runCall.memory?.scope, "profile");
    assert.equal(runCall.tools.length, 1);
    assert.equal(runCall.tools[0].methodId, "lookup");
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
    assert.deepEqual(runCall.triggerPayload, context.trigger);
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
