import assert from "node:assert/strict";
import { describe, it } from "node:test";

import plugin from "./index.ts";
import { createPineconeMethods, normalizePineconeConfig } from "./methods.ts";

describe("pinecone vector store plugin", () => {
  it("exports the generic vector store methods", () => {
    assert.equal(plugin.id, "sailor-pinecone");
    assert.equal(plugin.auth.type, "api_key");
    assert.equal(typeof plugin.methods.ensureCollection, "function");
    assert.equal(typeof plugin.methods.upsertDocuments, "function");
    assert.equal(typeof plugin.methods.querySimilar, "function");
    assert.equal(typeof plugin.methods.deleteDocuments, "function");
    assert.equal(typeof plugin.methods.describeCollection, "function");
  });

  it("validates local mode without an API key", () => {
    const config = normalizePineconeConfig({
      collectionName: "docs",
      dimension: 3,
      metric: "cosine",
      config: {
        mode: "local",
        localHost: "http://localhost:5080",
        namespace: "dev",
      },
    });

    assert.equal(config.mode, "local");
    assert.equal(config.endpoint, "http://localhost:5080");
    assert.equal(config.namespace, "dev");
    assert.equal(config.apiKey, undefined);
  });

  it("validates cloud mode with an API key", () => {
    const config = normalizePineconeConfig(
      {
        collectionName: "docs",
        dimension: 3,
        metric: "cosine",
        config: {
          mode: "cloud",
          host: "https://docs-example.svc.aped-4627-b74a.pinecone.io",
        },
      },
      { credentials: { apiKey: "pc-key" } } as any,
    );

    assert.equal(config.mode, "cloud");
    assert.equal(config.apiKey, "pc-key");
  });

  it("upserts documents through the Pinecone vector API", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const methods = createPineconeMethods(async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return jsonResponse({ upsertedCount: 1 });
    });

    const result = await methods.upsertDocuments({
      store: {
        collectionName: "docs",
        dimension: 3,
        metric: "cosine",
        config: { mode: "local", localHost: "http://localhost:5080", namespace: "dev" },
      },
      documents: [{
        id: "text-dataset_1:0",
        text: "hello",
        vector: [0.1, 0.2, 0.3],
        metadata: { source: "test" },
      }],
    });

    assert.equal(result.upsertedCount, 1);
    assert.equal(calls[0].url, "http://localhost:5080/vectors/upsert");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      namespace: "dev",
      vectors: [{
        id: "text-dataset_1:0",
        values: [0.1, 0.2, 0.3],
        metadata: { source: "test", documentId: "text-dataset_1:0", text: "hello" },
      }],
    });
  });

  it("queries similar vectors through the Pinecone vector API", async () => {
    const methods = createPineconeMethods(async () => jsonResponse({
      matches: [{
        id: "pinecone-vector-id",
        score: 0.9,
        metadata: { text: "hello", documentId: "text-dataset_1:0", source: "test" },
      }],
    }));

    const result = await methods.querySimilar({
      store: {
        collectionName: "docs",
        dimension: 3,
        metric: "cosine",
        config: { mode: "local", localHost: "http://localhost:5080" },
      },
      query: { vector: [0.1, 0.2, 0.3], topK: 3 },
    });

    assert.deepEqual(result, [{
      id: "text-dataset_1:0",
      score: 0.9,
      text: "hello",
      metadata: { documentId: "text-dataset_1:0", source: "test" },
    }]);
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as Response;
}
