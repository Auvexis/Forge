import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EmbeddingExecutionService } from "./embedding-execution-service.ts";
import { VectorStoreExecutionService } from "./vector-store-execution-service.ts";

describe("provider-neutral AI services", () => {
  it("normalizes embedding provider vectors", async () => {
    const service = new EmbeddingExecutionService(async () => ({ data: [{ embedding: [1] }, { embedding: [2] }] }));
    const vectors = await service.embedMany({ providerId: "openai", methodId: "embed", configuration: { model: "small" } }, ["a", "b"]);
    assert.deepEqual(vectors, [[1], [2]]);
  });

  it("normalizes Ollama embed responses", async () => {
    const service = new EmbeddingExecutionService(async () => ({ embeddings: [[0.1, 0.2], [0.3, 0.4]] }));
    const vectors = await service.embedMany({ providerId: "ollama", methodId: "createEmbeddings", configuration: { model: "nomic" } }, ["a", "b"]);
    assert.deepEqual(vectors, [[0.1, 0.2], [0.3, 0.4]]);
  });

  it("normalizes vector search results and context", async () => {
    const embeddings = new EmbeddingExecutionService(async () => ({ vectors: [[0.1, 0.2]] }));
    const service = new VectorStoreExecutionService(async (_pluginId, methodId) => methodId === "ensure"
      ? { ok: true }
      : { items: [{ id: "1", text: "A", score: 0.9, metadata: { source: "doc" } }] }, embeddings);
    const result = await service.query({
      providerId: "qdrant", methods: { ensureCollection: "ensure", querySimilar: "query" },
      configuration: { collectionName: "docs", dimension: 2, metric: "cosine", config: {} },
      embedding: { providerId: "openai", methodId: "embed", configuration: { model: "small" } },
    }, { query: "hello", topK: 5, maxContextChars: 100 });
    assert.deepEqual(result.documents, [{ id: "1", content: "A", score: 0.9, metadata: { source: "doc" } }]);
    assert.equal(result.context, "A");
    assert.equal(result.metadata?.providerId, "qdrant");
  });

  it("ensures the vector collection before embedding documents for indexing", async () => {
    const calls: string[] = [];
    const embeddings = new EmbeddingExecutionService(async (_pluginId, methodId) => {
      calls.push(methodId);
      return { vectors: [[0.1, 0.2]] };
    });
    const service = new VectorStoreExecutionService(async (_pluginId, methodId) => {
      calls.push(methodId);
      return methodId === "upsert" ? { upsertedCount: 1 } : { ok: true };
    }, embeddings);

    await service.index({
      providerId: "qdrant",
      methods: { ensureCollection: "ensure", upsertDocuments: "upsert", querySimilar: "query" },
      configuration: { collectionName: "docs", dimension: 2, metric: "cosine", config: {} },
      embedding: { providerId: "ollama", methodId: "embed", configuration: { model: "nomic" } },
    }, [{ id: "doc-1", text: "hello", metadata: {} }]);

    assert.deepEqual(calls, ["ensure", "embed", "upsert"]);
  });
});
