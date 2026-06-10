import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createUtilityNodeRegistry } from "../registry.ts";

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
});
