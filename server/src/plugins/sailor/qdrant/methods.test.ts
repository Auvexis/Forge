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

  it("validates self-hosted mode with optional API key and transport flags", () => {
    const config = normalizeQdrantConfig(
      {
        collectionName: "docs",
        dimension: 3,
        metric: "dot",
        config: {
          mode: "self-hosted",
          url: "https://qdrant.internal",
          preferGrpc: true,
          tls: true,
          timeoutMs: 45000,
        },
      },
      { credentials: { apiKey: "self-hosted-key" } } as any,
    );

    assert.equal(config.mode, "self-hosted");
    assert.equal(config.url, "https://qdrant.internal");
    assert.equal(config.apiKey, "self-hosted-key");
    assert.equal(config.preferGrpc, true);
    assert.equal(config.tls, true);
    assert.equal(config.timeoutMs, 45000);
  });

  it("creates collections through the Qdrant collections API", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const methods = createQdrantMethods(async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      if (init?.method === "GET") return errorResponse(404, { status: { error: "Not found" } });
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
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[1].url, "http://localhost:6333/collections/docs");
    assert.equal(calls[1].init.method, "PUT");
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
      vectors: { size: 3, distance: "Cosine" },
    });
  });

  it("does not create collections that already exist", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const methods = createQdrantMethods(async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return jsonResponse({ result: { status: "green" } });
    });

    const result = await methods.ensureCollection({
      store: {
        collectionName: "docs",
        dimension: 3,
        metric: "cosine",
        config: { mode: "local", url: "http://localhost:6333" },
      },
    });

    assert.deepEqual(result, { ok: true, collectionName: "docs" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://localhost:6333/collections/docs");
    assert.equal(calls[0].init.method, "GET");
  });

  it("treats an existing collection as ensured", async () => {
    const methods = createQdrantMethods(async (_url, init) => {
      if (init?.method === "GET") return errorResponse(404, { status: { error: "Not found" } });
      return errorResponse(409, {
        status: { error: "Wrong input: Collection docs already exists!" },
        time: 0.0001,
      });
    });

    const result = await methods.ensureCollection({
      store: {
        collectionName: "docs",
        dimension: 3,
        metric: "cosine",
        config: { mode: "local", url: "http://localhost:6333" },
      },
    });

    assert.deepEqual(result, { ok: true, collectionName: "docs" });
  });

  it("upserts documents with Qdrant-compatible point ids", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const methods = createQdrantMethods(async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return jsonResponse({ result: true });
    });

    await methods.upsertDocuments({
      store: {
        collectionName: "docs",
        dimension: 3,
        metric: "cosine",
        config: { mode: "local", url: "http://localhost:6333" },
      },
      documents: [{
        id: "text-dataset_1:0",
        text: "hello",
        vector: [0.1, 0.2, 0.3],
        metadata: {
          source: { filename: "test.csv" },
          data: { nome: "Ana" },
        },
      }],
    });

    const body = JSON.parse(String(calls[0].init.body));
    assert.equal(calls[0].url, "http://localhost:6333/collections/docs/points?wait=true");
    assert.match(body.points[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.deepEqual(body.points[0].payload, {
      source: { filename: "test.csv" },
      data: { nome: "Ana" },
      documentId: "text-dataset_1:0",
      text: "hello",
    });
  });

  it("queries similar vectors through the Qdrant search API", async () => {
    const methods = createQdrantMethods(async () => jsonResponse({
      result: [{
        id: "159ab48b-4675-4d53-9dde-c9def9e83fd8",
        score: 0.9,
        payload: { text: "hello", documentId: "text-dataset_1:0", source: "test" },
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

function errorResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as Response;
}
