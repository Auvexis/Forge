import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import { createMigrationEngine } from "../../database/migration-engine.ts";
import { resetAppDatabaseProvider, setAppDatabaseProvider } from "../app/app-repository.ts";
import { AgentRuntimeService } from "../agent-runtime/agent-runtime-service.ts";
import type { AgentRunInput } from "../agent-runtime/agent-types.ts";
import { PluginExecutor } from "../plugins/executor.ts";
import { WorkflowEngine } from "./executor.ts";
import { workflowEventBus } from "./event-bus.ts";
import {
  resetWorkflowDatabaseProvider,
  setWorkflowDatabaseProvider,
  WorkflowRepository,
} from "./repository.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

describe("workflow executor AI config-node traversal", () => {
  const originalRunAgent = AgentRuntimeService.runAgent;
  const originalPluginExecute = PluginExecutor.execute;
  let appDb: Database.Database | null = null;
  let workflowDb: Database.Database | null = null;

  beforeEach(async () => {
    appDb = await createMigratedDb("app");
    workflowDb = await createMigratedDb("workflows");
    setAppDatabaseProvider(() => appDb!);
    setWorkflowDatabaseProvider(() => workflowDb!);
  });

  afterEach(() => {
    AgentRuntimeService.runAgent = originalRunAgent;
    PluginExecutor.execute = originalPluginExecute;
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
    appDb?.close();
    workflowDb?.close();
    appDb = null;
    workflowDb = null;
  });

  it("executes trigger -> ai-agent -> set in order", async () => {
    AgentRuntimeService.runAgent = async () => ({
      status: "success",
      output: "hello",
      toolCallCount: 0,
      iterationCount: 1,
    });
    const workflow = workflowFixture({
      edges: [
        { id: "trigger-agent", source: "trigger", target: "agent" },
        { id: "model-agent", source: "model", target: "agent" },
        { id: "agent-set", source: "agent", target: "set" },
      ],
    });
    WorkflowRepository.saveWorkflow(workflow);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      workflow,
      "trigger",
      triggerPayload(),
      "exec_agent_flow",
    );

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.context.steps.agent.output.output, "hello");
    assert.deepEqual(result.context.steps.set.output, { answer: "hello" });
  });

  it("executes config-capable nodes only when they are also reached by normal flow edges", async () => {
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
    const workflow = workflowFixture({
      edges: [
        { id: "trigger-model", source: "trigger", target: "model" },
        { id: "trigger-agent", source: "trigger", target: "agent" },
        { id: "model-agent", source: "model", target: "agent" },
        { id: "memory-agent", source: "memory", target: "agent" },
        { id: "tool-agent", source: "tool", target: "agent" },
      ],
    });
    WorkflowRepository.saveWorkflow(workflow);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      workflow,
      "trigger",
      triggerPayload(),
      "exec_config_flow",
    );

    assert.equal(result.status, "SUCCESS");
    assert.ok(result.context.steps.model);
    assert.equal(result.context.steps.memory, undefined);
    assert.equal(result.context.steps.tool, undefined);
    assert.ok(received);
    const runCall = received as AgentRunInput;
    assert.equal(runCall.model.model, "gpt-test");
    assert.equal(runCall.memory?.scope, "profile");
    assert.equal(runCall.tools.length, 1);
  });

  it("ignores disconnected AI config nodes", async () => {
    AgentRuntimeService.runAgent = async () => ({
      status: "success",
      output: "ok",
      toolCallCount: 0,
      iterationCount: 1,
    });
    const workflow = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        unusedModel: {
          type: "ai-model",
          name: "Unused",
          pluginId: "openai",
          adapter: "openai-compatible",
          model: "unused",
          temperature: 0,
        },
      },
      edges: [
        { id: "trigger-agent", source: "trigger", target: "agent" },
        { id: "model-agent", source: "model", target: "agent" },
      ],
    });
    WorkflowRepository.saveWorkflow(workflow);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      workflow,
      "trigger",
      triggerPayload(),
      "exec_disconnected_config",
    );

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.context.steps.unusedModel, undefined);
  });

  it("executes embeddings when they are reached through a normal flow edge", async () => {
    const workflow = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        embeddings: {
          type: "embeddings",
          name: "Embeddings",
          pluginId: "embedding-provider",
          methodId: "createEmbeddings",
          model: "embedding-model",
          dimension: 1536,
          input: "",
        },
        vector: {
          type: "vector-store",
          name: "Vector Store",
          pluginId: "vector-provider",
          ensureCollectionMethodId: "ensureCollection",
          upsertMethodId: "upsertDocuments",
          queryMethodId: "querySimilar",
          collectionName: "documents",
          dimension: 1536,
          metric: "cosine",
          config: {},
        },
      },
      edges: [
        { id: "trigger-embeddings", source: "trigger", target: "embeddings" },
        { id: "trigger-vector", source: "trigger", target: "vector" },
        { id: "embeddings-vector", source: "embeddings", target: "vector", targetHandle: "embedding" },
      ],
    });
    WorkflowRepository.saveWorkflow(workflow);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      workflow,
      "trigger",
      triggerPayload(),
      "exec_vector_embedding_config",
    );

    assert.equal(result.status, "SUCCESS");
    assert.ok(result.context.steps.embeddings);
    assert.ok(result.context.steps.vector?.output);
  });

  it("emits execution events for vector store subnodes", async () => {
    PluginExecutor.execute = async (_pluginId, methodId) => {
      if (methodId === "createEmbeddings") return { vectors: [[0.1, 0.2, 0.3]] };
      if (methodId === "upsertDocuments") return { upsertedCount: 1 };
      return { ok: true };
    };
    const workflow = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        dataset: {
          type: "text-dataset",
          name: "Dataset",
          text: "hello",
          format: "plain-text",
          chunking: {
            enabled: false,
            chunkSize: 1000,
            chunkOverlap: 0,
            contextualOverlapEnabled: false,
          },
        },
        embeddings: {
          type: "embeddings",
          name: "Embeddings",
          pluginId: "embedding-provider",
          methodId: "createEmbeddings",
          model: "embedding-model",
          dimension: 3,
          input: "",
        },
        vector: {
          type: "vector-store",
          name: "Vector Store",
          pluginId: "vector-provider",
          ensureCollectionMethodId: "ensureCollection",
          upsertMethodId: "upsertDocuments",
          queryMethodId: "querySimilar",
          collectionName: "documents",
          dimension: 3,
          metric: "cosine",
          config: {},
          retrievalMode: "index",
        },
      },
      edges: [
        { id: "trigger-vector", source: "trigger", target: "vector" },
        { id: "dataset-vector", source: "dataset", target: "vector", targetHandle: "document" },
        { id: "embeddings-vector", source: "embeddings", target: "vector", targetHandle: "embedding" },
      ],
    });
    WorkflowRepository.saveWorkflow(workflow);
    const executionId = "exec_vector_subnode_events";
    const events: string[] = [];
    const unsubscribe = workflowEventBus.onExecution(executionId, (event) => {
      if (event.type === "node:start" || event.type === "node:success") {
        events.push(`${event.type}:${event.nodeId}`);
      }
    });

    try {
      const result = await WorkflowEngine.executeWorkflowFromTrigger(
        workflow,
        "trigger",
        triggerPayload(),
        executionId,
      );

      assert.equal(result.status, "SUCCESS");
      assert.deepEqual(events, [
        "node:start:vector",
        "node:start:dataset",
        "node:success:dataset",
        "node:start:embeddings",
        "node:success:embeddings",
        "node:success:vector",
      ]);
    } finally {
      unsubscribe();
    }
  });

  it("does not classify arbitrary edges between configuration-role nodes as dependency cycles", async () => {
    let runAgentCalled = false;
    AgentRuntimeService.runAgent = async () => {
      runAgentCalled = true;
      return {
        status: "success",
        output: "ok",
        toolCallCount: 0,
        iterationCount: 1,
      };
    };
    const workflow = workflowFixture({
      edges: [
        { id: "trigger-agent", source: "trigger", target: "agent" },
        { id: "model-memory", source: "model", target: "memory" },
        { id: "memory-model", source: "memory", target: "model" },
        { id: "model-agent", source: "model", target: "agent" },
      ],
    });
    WorkflowRepository.saveWorkflow(workflow);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      workflow,
      "trigger",
      triggerPayload(),
      "exec_config_cycle",
    );

    assert.equal(result.status, "SUCCESS");
    assert.equal(runAgentCalled, true);
  });
});

function triggerPayload() {
  return {
    profileId: "profile_1",
    sessionId: "chat_session_1",
    message: "Hi",
  };
}

async function createMigratedDb(kind: "app" | "workflows"): Promise<Database.Database> {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  await createMigrationEngine(database, kind).up();
  return database;
}

function workflowFixture(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    metadata: {
      id: "workflow_agent_config",
      name: "Agent config traversal",
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
        name: "Tool",
        pluginId: "plugin",
        methodId: "lookup",
        timeoutMs: 30000,
        requiresApproval: false,
        sideEffect: "read",
      },
      set: {
        type: "set",
        name: "Set",
        assignments: [{ key: "answer", value: "{{ steps.agent.output.output }}" }],
      },
    },
    edges: [],
    ...overrides,
  };
}
