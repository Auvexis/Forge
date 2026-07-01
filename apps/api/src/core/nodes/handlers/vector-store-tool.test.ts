import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { CallableAgentToolConfig } from "../../modules/agent-runtime/agent-types.ts";
import { ChatModelExecutionService } from "../../modules/ai-services/chat-model-execution-service.ts";
import { ConfigDependencyResolver } from "../dependencies/config-dependency-resolver.ts";
import { createCoreCapabilityAdapterRegistry } from "../dependencies/core-capability-adapters.ts";

describe("Vector Store Tool", () => {
  const originalInvoke = ChatModelExecutionService.prototype.invoke;
  afterEach(() => { ChatModelExecutionService.prototype.invoke = originalInvoke; });

  it("resolves dependencies recursively and exposes a configured callable tool", async () => {
    const modelCalls: Record<string, any>[] = [];
    ChatModelExecutionService.prototype.invoke = async (_model, request) => {
      modelCalls.push(request);
      return { content: "Refunds are available within 30 days." };
    };
    const pluginCalls: string[] = [];
    const input = executionInput(async (pluginId, methodId) => {
      pluginCalls.push(`${pluginId}:${methodId}`);
      if (methodId === "embed") return { vectors: [[0.1, 0.2, 0.3]] };
      if (methodId === "query") return { items: [{ id: "policy", text: "Refunds are available within 30 days.", score: 0.94, metadata: {} }] };
      return {};
    });
    const dependencies = await new ConfigDependencyResolver(createCoreCapabilityAdapterRegistry()).resolveForNode(input as any, "agent");
    const tool = dependencies.getOne<CallableAgentToolConfig>("tool");

    assert.equal(tool.name, "search_refund_policy");
    assert.equal(tool.description, "Search the refund policy knowledge base.");
    assert.equal(tool.sideEffect, "read");
    assert.equal(typeof tool.invoke, "function");
    const result = await tool.invoke({ query: "refund policy" });

    assert.deepEqual(pluginCalls, ["ollama:embed", "qdrant:ensure", "qdrant:query"]);
    assert.match(JSON.stringify(modelCalls[0]), /Refunds are available within 30 days/);
    assert.deepEqual(result, {
      answer: "Refunds are available within 30 days.",
      sources: [{ id: "policy", content: "Refunds are available within 30 days.", score: 0.94, metadata: {} }],
      metadata: { query: "refund policy", documentCount: 1 },
    });
  });

  it("rejects an empty query before retrieval", async () => {
    const dependencies = await new ConfigDependencyResolver(createCoreCapabilityAdapterRegistry())
      .resolveForNode(executionInput(async () => { throw new Error("should not execute"); }) as any, "agent");
    const tool = dependencies.getOne<CallableAgentToolConfig>("tool");
    await assert.rejects(tool.invoke({ query: "  " }), /non-empty query/i);
  });
});

function executionInput(executePluginMethod: (pluginId: string, methodId: string, params: Record<string, any>) => Promise<any>) {
  const nodes = {
    agent: { type: "ai-agent", name: "Agent", prompt: "Help", maxIterations: 3, maxToolCalls: 3, maxRetriesPerTool: 1, timeoutMs: 30000, requireApprovalForSideEffects: [], outputMode: "text" },
    agentModel: { type: "ai-model", name: "Agent Model", pluginId: "openai", adapter: "openai-compatible", model: "gpt-agent", temperature: 0 },
    tool: { type: "vector-store-tool", name: "Vector Tool", toolName: "search_refund_policy", description: "Search the refund policy knowledge base.", topK: 3, scoreThreshold: 0.8, instructions: "Answer concisely." },
    toolModel: { type: "ai-model", name: "Tool Model", pluginId: "openai", adapter: "openai-compatible", model: "gpt-tool", temperature: 0 },
    store: { type: "vector-store", name: "Store", pluginId: "qdrant", collectionName: "docs", dimension: 3, metric: "cosine", config: {}, ensureCollectionMethodId: "ensure", queryMethodId: "query" },
    embedding: { type: "embeddings", name: "Embedding", pluginId: "ollama", methodId: "embed", model: "nomic", dimension: 3, batchSize: 8 },
  };
  const edges = [
    { id: "agent-model", source: "agentModel", target: "agent", targetHandle: "chatModel" },
    { id: "tool-agent", source: "tool", target: "agent", targetHandle: "tool" },
    { id: "embedding-store", source: "embedding", target: "store", targetHandle: "embedding" },
    { id: "store-tool", source: "store", target: "tool", targetHandle: "vectorStore" },
    { id: "model-tool", source: "toolModel", target: "tool", targetHandle: "model" },
  ];
  return {
    nodeId: "agent", node: nodes.agent,
    context: { trigger: {}, steps: {}, variables: {} },
    workflow: { metadata: { id: "wf", name: "Workflow", version: "1", isActive: true, isDraft: false, public: false, createdAt: new Date(0).toISOString() }, trigger: { type: "manual" }, nodes, edges },
    edges, executionId: "exec",
    services: { executePluginMethod, executeNode: async () => undefined, executeWorkflow: async () => undefined, getWorkflowById: () => null, emitInternalEvent: async () => ({ triggered: [] }), resolvePendingWebhookResponse: () => false, emitNodeStart: () => undefined, emitNodeSuccess: () => undefined, emitNodeFailure: () => undefined },
  };
}
