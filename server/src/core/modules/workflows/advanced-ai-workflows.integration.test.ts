import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import { createMigrationEngine } from "../../database/migration-engine.ts";
import { resetAppDatabaseProvider, setAppDatabaseProvider } from "../app/app-repository.ts";
import { AgentRuntimeService } from "../agent-runtime/agent-runtime-service.ts";
import { ChatModelExecutionService } from "../ai-services/chat-model-execution-service.ts";
import { PluginExecutor } from "../plugins/executor.ts";
import { CapabilityAdapterRegistry } from "../../nodes/dependencies/capability-adapter-registry.ts";
import { ConfigDependencyResolver } from "../../nodes/dependencies/config-dependency-resolver.ts";
import { createCoreCapabilityAdapterRegistry } from "../../nodes/dependencies/core-capability-adapters.ts";
import { getUtilityNodeCatalogItem } from "../../utility-nodes/utility-node-catalog.ts";
import type { UtilityNodeCatalogItem } from "../../utility-nodes/utility-node-pack.types.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import { WorkflowEngine } from "./executor.ts";
import { resetWorkflowDatabaseProvider, setWorkflowDatabaseProvider, WorkflowRepository } from "./repository.ts";

describe("advanced AI workflows", () => {
  const originalModelInvoke = ChatModelExecutionService.prototype.invoke;
  const originalPluginExecute = PluginExecutor.execute;
  const originalRunAgent = AgentRuntimeService.runAgent;
  let appDb: Database.Database;
  let workflowDb: Database.Database;

  beforeEach(async () => {
    appDb = await migratedDb("app");
    workflowDb = await migratedDb("workflows");
    setAppDatabaseProvider(() => appDb);
    setWorkflowDatabaseProvider(() => workflowDb);
  });

  afterEach(() => {
    ChatModelExecutionService.prototype.invoke = originalModelInvoke;
    PluginExecutor.execute = originalPluginExecute;
    AgentRuntimeService.runAgent = originalRunAgent;
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
    appDb.close();
    workflowDb.close();
  });

  it("executes Basic LLM Chain with model and parser config nodes", async () => {
    ChatModelExecutionService.prototype.invoke = async () => ({ content: '{"category":"billing"}' });
    const fixture = basicChainWorkflow();
    WorkflowRepository.saveWorkflow(fixture);
    const result = await WorkflowEngine.executeWorkflowFromTrigger(fixture, "trigger", { message: "classify" }, "exec_basic_chain");

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.context.steps.chain.output.output, { category: "billing" });
    assert.deepEqual(result.context.steps.set.output, { category: "billing" });
    assertConfigNodesAbsent(result.context.steps, ["model", "parser"]);
  });

  it("executes nested Q&A retrieval while preserving sources and metadata", async () => {
    ChatModelExecutionService.prototype.invoke = async () => ({ content: "Refunds are available within 30 days." });
    mockVectorProviders();
    const fixture = questionAnswerWorkflow();
    WorkflowRepository.saveWorkflow(fixture);
    const result = await WorkflowEngine.executeWorkflowFromTrigger(fixture, "trigger", { question: "refund policy" }, "exec_qa_chain");

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.context.steps.qa.output.answer, "Refunds are available within 30 days.");
    assert.equal(result.context.steps.qa.output.sources[0].id, "policy");
    assert.equal(result.context.steps.qa.output.metadata.retrieval.documentCount, 1);
    assert.deepEqual(result.context.steps.set.output, { answer: "Refunds are available within 30 days." });
    assertConfigNodesAbsent(result.context.steps, ["model", "retriever", "store", "embedding"]);
  });

  it("executes AI Agent with a callable Vector Store Tool dependency", async () => {
    ChatModelExecutionService.prototype.invoke = async () => ({ content: "Refunds are available within 30 days." });
    mockVectorProviders();
    AgentRuntimeService.runAgent = async (input) => {
      const tool = input.tools[0];
      if (!tool || !("invoke" in tool)) throw new Error("Expected a callable vector store tool.");
      const toolResult = await tool.invoke({ query: "refund policy" });
      return { status: "success", output: toolResult as Record<string, any>, toolCallCount: 1, iterationCount: 1 };
    };
    const fixture = agentToolWorkflow();
    WorkflowRepository.saveWorkflow(fixture);
    const result = await WorkflowEngine.executeWorkflowFromTrigger(fixture, "trigger", { message: "search refunds" }, "exec_agent_tool");

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.context.steps.agent.output.output.answer, "Refunds are available within 30 days.");
    assert.equal(result.context.steps.agent.output.output.sources[0].id, "policy");
    assert.deepEqual(result.context.steps.set.output, { answer: "Refunds are available within 30 days." });
    assertConfigNodesAbsent(result.context.steps, ["agentModel", "tool", "toolModel", "store", "embedding"]);
  });
});

describe("advanced AI dependency extensibility", () => {
  it("resolves a future chat-model provider for every existing compatible consumer handle", async () => {
    const registry = createCoreCapabilityAdapterRegistry();
    registry.register({
      capability: "chat-model",
      supports: (node) => node.type === "future-chat-model" as any,
      resolve: async () => ({ providerId: "future", configuration: { model: "future-1" } }),
    });
    const futureDefinition = fixtureDefinition("future-chat-model", ["chat-model"], []);
    const consumers = [
      ["ai-agent", "chatModel"],
      ["basic-llm-chain", "model"],
      ["question-answer-chain", "model"],
      ["vector-store-tool", "model"],
    ] as const;

    for (const [consumerType, handleId] of consumers) {
      const original = getUtilityNodeCatalogItem(consumerType)!;
      const handle = original.handles.find((candidate) => candidate.id === handleId)!;
      const consumerDefinition = { ...original, handles: [handle] };
      const resolver = new ConfigDependencyResolver(registry, (type) => {
        if (type === "future-chat-model") return futureDefinition;
        if (type === consumerType) return consumerDefinition;
        return null;
      });
      const dependency = await resolver.resolveForNode(dependencyInput(consumerType, handleId) as any, "consumer");
      assert.equal(dependency.getOne<any>(handleId).providerId, "future", `${consumerType}.${handleId}`);
    }
  });
});

function basicChainWorkflow(): WorkflowItem {
  return workflow({
    chain: { type: "basic-llm-chain", name: "Chain", prompt: "Classify", input: "{{ trigger.message }}" },
    model: modelNode(),
    parser: { type: "structured-json-parser", name: "Parser", schema: { type: "object", required: ["category"], properties: { category: { type: "string" } } }, strict: true, failurePolicy: "error" },
    set: setNode("{{ steps.chain.output.output.category }}", "category"),
  }, [flow("trigger", "chain"), config("model", "chain", "model"), config("parser", "chain", "outputParser"), flow("chain", "set")]);
}

function questionAnswerWorkflow(): WorkflowItem {
  return workflow({
    qa: { type: "question-answer-chain", name: "Q&A", question: "{{ trigger.question }}" }, model: modelNode(),
    retriever: { type: "vector-store-retriever", name: "Retriever", topK: 3, scoreThreshold: 0.8, maxContextChars: 4000 },
    store: vectorStoreNode(), embedding: embeddingNode(), set: setNode("{{ steps.qa.output.answer }}", "answer"),
  }, [flow("trigger", "qa"), config("model", "qa", "model"), config("retriever", "qa", "retriever"), config("store", "retriever", "vectorStore"), config("embedding", "store", "embedding"), flow("qa", "set")]);
}

function agentToolWorkflow(): WorkflowItem {
  return workflow({
    agent: { type: "ai-agent", name: "Agent", prompt: "Help", executionMode: "loop", maxIterations: 3, maxToolCalls: 3, maxRetriesPerTool: 1, timeoutMs: 30000, requireApprovalForSideEffects: [], outputMode: "text" },
    agentModel: modelNode(), tool: { type: "vector-store-tool", name: "Tool", toolName: "search_refunds", description: "Search refunds", topK: 3, scoreThreshold: 0.8 },
    toolModel: modelNode(), store: vectorStoreNode(), embedding: embeddingNode(), set: setNode("{{ steps.agent.output.output.answer }}", "answer"),
  }, [flow("trigger", "agent"), config("agentModel", "agent", "chatModel"), config("tool", "agent", "tool"), config("store", "tool", "vectorStore"), config("toolModel", "tool", "model"), config("embedding", "store", "embedding"), flow("agent", "set")]);
}

function workflow(nodes: Record<string, any>, edges: any[]): WorkflowItem {
  return { metadata: { id: `wf_${Math.random()}`, name: "Advanced AI", version: "1", isActive: true, isDraft: false, public: false, createdAt: new Date(0).toISOString() }, trigger: { type: "manual" }, nodes: { trigger: { type: "trigger", name: "Manual", trigger: { type: "manual" } }, ...nodes }, edges } as WorkflowItem;
}
const flow = (source: string, target: string) => ({ id: `${source}-${target}`, source, target });
const config = (source: string, target: string, targetHandle: string) => ({ id: `${source}-${target}-${targetHandle}`, source, target, targetHandle });
const modelNode = () => ({ type: "ai-model", name: "Model", pluginId: "openai", adapter: "openai-compatible", model: "gpt-test", temperature: 0 });
const embeddingNode = () => ({ type: "embeddings", name: "Embedding", pluginId: "ollama", methodId: "embed", model: "nomic", dimension: 3, batchSize: 8 });
const vectorStoreNode = () => ({ type: "vector-store", name: "Store", pluginId: "qdrant", collectionName: "docs", dimension: 3, metric: "cosine", config: {}, ensureCollectionMethodId: "ensure", queryMethodId: "query" });
const setNode = (value: string, key: string) => ({ type: "set", name: "Set", assignments: [{ key, value }] });

function mockVectorProviders() {
  PluginExecutor.execute = async (_pluginId, methodId) => {
    if (methodId === "embed") return { vectors: [[0.1, 0.2, 0.3]] };
    if (methodId === "query") return { items: [{ id: "policy", text: "Refunds are available within 30 days.", score: 0.94, metadata: {} }] };
    return {};
  };
}

function assertConfigNodesAbsent(steps: Record<string, any>, ids: string[]) {
  for (const id of ids) assert.equal(steps[id], undefined, id);
}

async function migratedDb(kind: "app" | "workflows") {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  await createMigrationEngine(database, kind).up();
  return database;
}

function fixtureDefinition(type: string, capabilities: string[], handles: any[]): UtilityNodeCatalogItem {
  return { type: type as any, label: type, description: type, category: "AI", role: "configuration", capabilities, handles, presentation: { base: "advanced" }, style: { icon: "box", iconColor: "#000", bgColor: "#fff", borderColor: "#aaa" }, packId: "fixture", packName: "Fixture" };
}

function dependencyInput(consumerType: string, handleId: string) {
  const nodes = { consumer: { type: consumerType, name: "Consumer" }, future: { type: "future-chat-model", name: "Future" } };
  const edges = [{ id: "future-consumer", source: "future", target: "consumer", targetHandle: handleId }];
  return { nodeId: "consumer", node: nodes.consumer, context: { trigger: {}, steps: {}, variables: {} }, workflow: { metadata: { id: "wf", name: "wf", version: "1", isActive: true, isDraft: false, public: false, createdAt: new Date(0).toISOString() }, trigger: { type: "manual" }, nodes, edges }, edges, executionId: "exec", services: {} };
}
