import assert from "node:assert/strict";
import { describe, it } from "node:test";

import plugin from "./index.ts";
import { createQdrantMethods, normalizeQdrantConfig } from "./methods.ts";

describe("qdrant vector store plugin", () => {
  it("exports the generic vector store methods", () => {
    assert.equal(plugin.id, "sailor-qdrant");
    assert.equal(plugin.auth.type, "api_key");
    assert.equal(typeof plugin.methods.ensureCollection, "function");
    assert.equal(typeof plugin.methods.upsertDocuments, "function");
    assert.equal(typeof plugin.methods.querySimilar, "function");
    assert.equal(typeof plugin.methods.deleteDocuments, "function");
    assert.equal(typeof plugin.methods.describeCollection, "function");
  });

  it("validates local mode without an API key", () => {
    const config = normalizeQdrantConfig({
      collectionName: "docs",
      dimension: 3,
      metric: "cosine",
      config: {
        mode: "local",
        url: "http://localhost:6333",
      },
    });

    assert.equal(config.mode, "local");
    assert.equal(config.url, "http://localhost:6333");
    assert.equal(config.apiKey, undefined);
  });

  it("validates cloud mode with an API key", () => {
    const config = normalizeQdrantConfig(
      {
        collectionName: "docs",
        dimension: 3,
        metric: "cosine",
        config: {
          mode: "cloud",
          url: "https://cluster.example.cloud.qdrant.io",
        },
      },
      { credentials: { apiKey: "qd-key" } } as any,
    );

    assert.equal(config.mode, "cloud");
    assert.equal(config.apiKey, "qd-key");
  });

  it("creates collections through the Qdrant collections API", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const methods = createQdrantMethods(async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return jsonResponse({ result: true });
    });

    const result = await methods.ensureCollection({
      store: {
        collectionName: "docs",
        dimension: 3,
        metric: "cosine",
        config: { mode: "local", url: "http://localhost:6333" },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "http://localhost:6333/collections/docs");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      vectors: { size: 3, distance: "Cosine" },
    });
  });

  it("queries similar vectors through the Qdrant search API", async () => {
    const methods = createQdrantMethods(async () => jsonResponse({
      result: [{
        id: "doc-1",
        score: 0.9,
        payload: { text: "hello", source: "test" },
      }],
    }));

    const result = await methods.querySimilar({
      store: {
        collectionName: "docs",
        dimension: 3,
        metric: "cosine",
        config: { mode: "local", url: "http://localhost:6333" },
      },
      query: { vector: [0.1, 0.2, 0.3], topK: 3 },
    });

    assert.deepEqual(result, [{
      id: "doc-1",
      score: 0.9,
      text: "hello",
      metadata: { source: "test" },
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
