import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createUtilityNodeRegistry } from "../registry.ts";
import type { WorkflowExecutionContext } from "../types.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

describe("retrieval utility node handlers", () => {
  it("registers first-party retrieval handlers with explicit metadata", () => {
    const registry = createUtilityNodeRegistry();

    for (const type of [
      "text-dataset",
      "file-dataset",
      "database-dataset",
      "embeddings",
      "vector-store",
      "retriever",
    ] as const) {
      const handler = registry.get(type);
      assert.equal(handler.type, type);
      assert.ok(handler.metadata.description.length > 0);
      assert.ok(handler.metadata.outputs.length > 0);
      assert.ok(handler.metadata.errors.length > 0);
    }
  });

  it("text dataset handler returns generic items consumable by non-AI nodes", async () => {
    const registry = createUtilityNodeRegistry();
    const handler = registry.get("text-dataset");

    const result = await handler.execute({
      nodeId: "dataset",
      executionId: "exec-1",
      workflow: {
        metadata: {
          id: "wf-1",
          name: "Workflow",
          version: "1.0.0",
          isActive: false,
          isDraft: true,
          public: false,
          createdAt: "2026-06-10T00:00:00.000Z",
        },
        trigger: { type: "manual" },
        nodes: {},
        edges: [],
      },
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "text-dataset",
        name: "Dataset",
        text: "hello world",
        format: "plain-text",
        metadata: { source: "manual" },
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.sourceType, "text");
    assert.equal(result.count, 1);
    assert.deepEqual(result.items[0], {
      id: "dataset:0",
      text: "hello world",
      metadata: { source: "manual" },
      raw: "hello world",
    });
  });

  it("text dataset JSON array output can feed Split In Batches", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture();
    const context: WorkflowExecutionContext = { trigger: {}, steps: {}, variables: {} };
    const dataset = await registry.get("text-dataset").execute({
      nodeId: "dataset",
      executionId: "exec-1",
      workflow,
      edges: workflow.edges,
      context,
      services: {} as any,
      node: {
        type: "text-dataset",
        name: "Dataset",
        text: JSON.stringify([
          { id: "a", body: "first", status: "new" },
          { id: "b", body: "second", status: "sent" },
        ]),
        format: "json-array",
        metadata: { source: "json" },
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });
    context.steps.dataset = { output: dataset };

    const split = await registry.get("split-in-batches").execute({
      nodeId: "split",
      executionId: "exec-1",
      workflow,
      edges: workflow.edges,
      context,
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
      node: {
        type: "split-in-batches",
        name: "Split",
        collection: "steps.dataset.output.items",
        batchSize: 1,
      },
    });

    assert.equal(dataset.count, 2);
    assert.equal(dataset.items[0].id, "a");
    assert.equal(dataset.items[0].text, "first");
    assert.deepEqual(dataset.items[0].metadata, { source: "json", status: "new" });
    assert.deepEqual(split, { batches: 2, totalItems: 2 });
  });

  it("file dataset decodes an uploaded base64 file into a dataset item", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const result = await handler.execute({
      nodeId: "files",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: [{
          filename: "notes.txt",
          content: Buffer.from("hello from upload").toString("base64"),
          mimeType: "text/plain",
          size: 17,
        }],
        format: "auto",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 1);
    assert.equal(result.items[0].text, "hello from upload");
    assert.deepEqual(result.items[0].metadata, {
      filename: "notes.txt",
      mimeType: "text/plain",
      size: 17,
    });
  });

  it("file dataset emits one dataset item per configured file", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const result = await handler.execute({
      nodeId: "files",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: [
          {
            filename: "first.md",
            content: Buffer.from("# First").toString("base64"),
            mimeType: "text/markdown",
          },
          {
            filename: "second.txt",
            content: Buffer.from("Second").toString("base64"),
            mimeType: "text/plain",
          },
        ],
        format: "auto",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 2);
    assert.deepEqual(result.items.map((item: any) => item.text), ["# First", "Second"]);
    assert.deepEqual(result.items.map((item: any) => item.id), ["files:0", "files:1"]);
  });

  it("vector store indexes connected dataset documents with connected embedding config", async () => {
    const calls: Array<{ pluginId: string; methodId: string; params: Record<string, any> }> = [];
    const workflow = workflowFixture();
    workflow.nodes = {
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
        name: "Vector",
        pluginId: "vector-provider",
        ensureCollectionMethodId: "ensureCollection",
        upsertMethodId: "upsertDocuments",
        queryMethodId: "querySimilar",
        collectionName: "documents",
        dimension: 3,
        metric: "cosine",
        config: {},
      },
    };
    workflow.edges = [
      { id: "dataset-vector", source: "dataset", target: "vector", targetHandle: "document" },
      { id: "embedding-vector", source: "embeddings", target: "vector", targetHandle: "embedding" },
    ];

    const result = await createUtilityNodeRegistry().get("vector-store").execute({
      nodeId: "vector",
      executionId: "exec-1",
      workflow,
      edges: workflow.edges,
      context: {
        trigger: {},
        variables: {},
        steps: {
          dataset: {
            output: {
              items: [{ id: "doc-1", text: "hello", metadata: { source: "test" } }],
              count: 1,
              sourceType: "text",
            },
          },
        },
      },
      services: {
        executePluginMethod: async (
          pluginId: string,
          methodId: string,
          params: Record<string, any>,
        ) => {
          calls.push({ pluginId, methodId, params });
          if (pluginId === "embedding-provider") return { vectors: [[0.1, 0.2, 0.3]] };
          if (methodId === "upsertDocuments") return { upsertedCount: 1 };
          return { ok: true };
        },
      } as any,
      node: workflow.nodes.vector,
    });

    assert.deepEqual(calls.map((call) => `${call.pluginId}:${call.methodId}`), [
      "embedding-provider:createEmbeddings",
      "vector-provider:ensureCollection",
      "vector-provider:upsertDocuments",
    ]);
    const upsertedDocument = calls[2]?.params.documents[0] as Record<string, any>;
    assert.equal(upsertedDocument.text, "hello");
    assert.deepEqual(upsertedDocument.vector, [0.1, 0.2, 0.3]);
    assert.equal(result.indexedCount, 1);
  });
});

function workflowFixture(): WorkflowItem {
  return {
    metadata: {
      id: "wf-1",
      name: "Workflow",
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: "2026-06-10T00:00:00.000Z",
    },
    trigger: { type: "manual" as const },
    nodes: {},
    edges: [],
  };
}
