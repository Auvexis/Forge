import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loopNodeHandler } from "./loop.ts";
import { splitInBatchesNodeHandler } from "./split-in-batches.ts";
import type {
  NodeHandlerInput,
  NodeHandlerServices,
  WorkflowExecutionContext,
} from "../types.ts";
import type { WorkflowEdge, WorkflowItem, WorkflowNode } from "../../../shared/models/workflow-types.ts";

function services(overrides: Partial<NodeHandlerServices> = {}): NodeHandlerServices {
  return {
    executeNode: async () => undefined,
    executeWorkflow: async () => undefined,
    emitNodeStart: () => undefined,
    emitNodeSuccess: () => undefined,
    emitNodeFailure: () => undefined,
    emitInternalEvent: async () => ({ triggered: [] }),
    getWorkflowById: () => null,
    resolvePendingWebhookResponse: () => false,
    ...overrides,
  };
}

function input(
  nodeId: string,
  node: WorkflowNode,
  nodes: Record<string, WorkflowNode>,
  edges: WorkflowEdge[],
  context: WorkflowExecutionContext,
  overrides: Partial<NodeHandlerServices> = {},
): NodeHandlerInput {
  return {
    nodeId,
    node,
    context,
    workflow: {
      metadata: {
        id: "workflow-1",
        name: "Test Workflow",
        version: "1.0.0",
        isActive: true,
        isDraft: false,
        public: false,
        createdAt: "2026-05-09T00:00:00.000Z",
      },
      trigger: { type: "manual" },
      nodes,
      edges,
      variables: [],
    } satisfies WorkflowItem,
    edges,
    executionId: "exec-1",
    services: services(overrides),
  };
}

describe("subgraph utility node handlers", () => {
  it("executes loop body once per item and exposes item variables", async () => {
    const loopNode = {
      type: "loop",
      name: "Loop",
      collection: "{{ trigger.items }}",
      maxIterations: 10,
    } as const;
    const bodyNode = { type: "set", name: "Body", assignments: [] } as const;
    const context = { trigger: { items: ["a", "b"] }, steps: {}, variables: {} };
    const seenItems: unknown[] = [];

    const result = await loopNodeHandler.execute(input(
      "loop-1",
      loopNode,
      { "loop-1": loopNode, body: bodyNode },
      [{ id: "edge-1", source: "loop-1", target: "body", sourceHandle: "loop-body" }],
      context,
      {
        executeNode: async ({ context: childContext }) => {
          seenItems.push(childContext.variables.$item);
          return { item: childContext.variables.$item };
        },
      },
    ));

    assert.deepEqual(result, {
      iterations: 2,
      results: [{ item: "a" }, { item: "b" }],
    });
    assert.deepEqual(seenItems, ["a", "b"]);
    assert.deepEqual(context.steps.body, { status: "SUCCESS", output: { item: "b" } });
    assert.equal("$item" in context.variables, false);
  });

  it("rejects loop collections that do not resolve to arrays", async () => {
    const loopNode = {
      type: "loop",
      name: "Loop",
      collection: "{{ trigger.notArray }}",
      maxIterations: 10,
    } as const;

    await assert.rejects(
      loopNodeHandler.execute(input(
        "loop-1",
        loopNode,
        { "loop-1": loopNode },
        [],
        { trigger: { notArray: "bad" }, steps: {}, variables: {} },
      )),
      /Loop node collection is not an array/,
    );
  });

  it("executes split-in-batches body once per chunk with batch variables", async () => {
    const splitNode = {
      type: "split-in-batches",
      name: "Split",
      collection: "trigger.items",
      batchSize: 2,
      maxBatches: 10,
    } as const;
    const bodyNode = { type: "set", name: "Body", assignments: [] } as const;
    const context = { trigger: { items: [1, 2, 3] }, steps: {}, variables: {} };
    const seenBatches: unknown[] = [];

    const result = await splitInBatchesNodeHandler.execute(input(
      "split-1",
      splitNode,
      { "split-1": splitNode, body: bodyNode },
      [{ id: "edge-1", source: "split-1", target: "body", sourceHandle: "batch-body" }],
      context,
      {
        executeNode: async ({ context: childContext }) => {
          seenBatches.push(childContext.variables.$batch);
          return { batch: childContext.variables.$batch };
        },
      },
    ));

    assert.deepEqual(result, { batches: 2, totalItems: 3 });
    assert.deepEqual(seenBatches, [[1, 2], [3]]);
    assert.deepEqual(context.steps.body, { status: "SUCCESS", output: { batch: [3] } });
    assert.equal("$batch" in context.variables, false);
  });

  it("rejects split-in-batches collections that do not resolve to arrays", async () => {
    const splitNode = {
      type: "split-in-batches",
      name: "Split",
      collection: "trigger.notArray",
      batchSize: 2,
    } as const;

    await assert.rejects(
      splitInBatchesNodeHandler.execute(input(
        "split-1",
        splitNode,
        { "split-1": splitNode },
        [],
        { trigger: { notArray: "bad" }, steps: {}, variables: {} },
      )),
      /did not resolve to an array/,
    );
  });
});
