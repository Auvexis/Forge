import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RetrieverRef } from "../../modules/ai-services/ai-service-types.ts";
import { ConfigDependencyResolver } from "../dependencies/config-dependency-resolver.ts";
import { createCoreCapabilityAdapterRegistry } from "../dependencies/core-capability-adapters.ts";

describe("Vector Store Retriever", () => {
  it("resolves a Vector Store recursively and normalizes limited retrieval results", async () => {
    const pluginCalls: Array<{ pluginId: string; methodId: string; params: Record<string, any> }> = [];
    const workflow = {
      metadata: { id: "wf", name: "Workflow", version: "1", isActive: true, isDraft: false, public: false, createdAt: new Date(0).toISOString() },
      trigger: { type: "manual" },
      nodes: {
        retriever: { type: "vector-store-retriever", name: "Retriever", topK: 2, scoreThreshold: 0.8, maxContextChars: 18 },
        store: { type: "vector-store", name: "Store", pluginId: "qdrant", collectionName: "docs", dimension: 3, metric: "cosine", config: {}, ensureCollectionMethodId: "ensure", queryMethodId: "query" },
        embedding: { type: "embeddings", name: "Embedding", pluginId: "ollama", methodId: "embed", model: "nomic", dimension: 3, batchSize: 8 },
        model: { type: "ai-model", name: "Model", pluginId: "openai", adapter: "openai-compatible", model: "gpt-test", temperature: 0 },
      },
      edges: [
        { id: "embedding-store", source: "embedding", target: "store", targetHandle: "embedding" },
        { id: "store-retriever", source: "store", target: "retriever", targetHandle: "vectorStore" },
      ],
    };
    const input = executionInput(workflow, async (pluginId, methodId, params) => {
      pluginCalls.push({ pluginId, methodId, params });
      if (methodId === "embed") return { vectors: [[0.1, 0.2, 0.3]] };
      if (methodId === "query") return { items: [
        { id: "a", text: "First document", score: 0.95, metadata: { source: "a" } },
        { id: "b", content: "Second document", score: 0.85 },
        { id: "c", text: "Rejected document", score: 0.5 },
      ] };
      return {};
    });

    const dependencies = await new ConfigDependencyResolver(createCoreCapabilityAdapterRegistry())
      .resolveForNode(input as any, "consumer");
    const retriever = dependencies.getOne<RetrieverRef>("retriever");
    const result = await retriever.retrieve("refund policy");

    assert.deepEqual(result.documents, [
      { id: "a", content: "First document", score: 0.95, metadata: { source: "a" } },
      { id: "b", content: "Second document", score: 0.85, metadata: {} },
    ]);
    assert.equal(result.context, "First document\n\nSe");
    assert.deepEqual(result.metadata, { providerId: "qdrant", topK: 2, documentCount: 2 });
    assert.deepEqual(pluginCalls.map(({ pluginId, methodId }) => `${pluginId}:${methodId}`), [
      "ollama:embed",
      "qdrant:ensure",
      "qdrant:query",
    ]);
    assert.equal(pluginCalls[2]?.params.query.scoreThreshold, 0.8);
  });
});

function executionInput(workflow: any, executePluginMethod: (pluginId: string, methodId: string, params: Record<string, any>) => Promise<any>) {
  return {
    nodeId: "consumer",
    node: { type: "question-answer-chain", name: "Q&A", question: "Question" },
    context: { trigger: {}, steps: {}, variables: {} },
    workflow: {
      ...workflow,
      nodes: { ...workflow.nodes, consumer: { type: "question-answer-chain", name: "Q&A", question: "Question" } },
      edges: [
        ...workflow.edges,
        { id: "model-consumer", source: "model", target: "consumer", targetHandle: "model" },
        { id: "retriever-consumer", source: "retriever", target: "consumer", targetHandle: "retriever" },
      ],
    },
    edges: workflow.edges,
    executionId: "exec",
    services: {
      executePluginMethod,
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
