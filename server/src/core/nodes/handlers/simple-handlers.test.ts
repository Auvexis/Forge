import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { eventListenerNodeHandler } from "./event-listener.ts";
import { ifNodeHandler } from "./if.ts";
import { mergeNodeHandler } from "./merge.ts";
import { setNodeHandler } from "./set.ts";
import { switchNodeHandler } from "./switch.ts";
import { triggerNodeHandler } from "./trigger.ts";
import type { NodeHandlerInput, WorkflowExecutionContext } from "../types.ts";
import type { WorkflowItem, WorkflowNode } from "../../../shared/models/workflow-types.ts";

function input(node: WorkflowNode, context: WorkflowExecutionContext): NodeHandlerInput {
  return {
    nodeId: "node-1",
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
      nodes: { "node-1": node },
      edges: [],
      variables: [],
    } satisfies WorkflowItem,
    edges: [],
    executionId: "exec-1",
    services: {
      executeNode: async () => undefined,
      executeWorkflow: async () => undefined,
      emitNodeStart: () => undefined,
      emitNodeSuccess: () => undefined,
      emitNodeFailure: () => undefined,
    },
  };
}

describe("simple utility node handlers", () => {
  it("evaluates if conditions to then or else branches", async () => {
    const context = {
      trigger: { active: true },
      steps: {},
      variables: { threshold: 10 },
    };

    const result = await ifNodeHandler.execute(input({
      type: "if",
      name: "Is Active",
      condition: "trigger.active && variables.threshold === 10",
    }, context));

    assert.deepEqual(result, { branch: "then" });
  });

  it("resolves set assignments with workflow template expressions", async () => {
    const context = {
      trigger: { customer: { name: "Ada" } },
      steps: { fetch: { output: { total: 42 } } },
      variables: {},
    };

    const result = await setNodeHandler.execute(input({
      type: "set",
      name: "Set Fields",
      assignments: [
        { key: "name", value: "{{ trigger.customer.name }}" },
        { key: "summary", value: "Total: {{ steps.fetch.output.total }}" },
      ],
    }, context));

    assert.deepEqual(result, { name: "Ada", summary: "Total: 42" });
  });

  it("routes switch nodes to the first matching handle or fallback", async () => {
    const context = {
      trigger: { status: "paid" },
      steps: {},
      variables: {},
    };

    const result = await switchNodeHandler.execute(input({
      type: "switch",
      name: "Status Switch",
      inputExpression: "trigger.status",
      cases: [
        { value: "pending", handleId: "case-pending" },
        { value: "paid", handleId: "case-paid" },
      ],
      fallbackHandleId: "case-fallback",
    }, context));

    assert.deepEqual(result, { activeHandle: "case-paid" });
  });

  it("returns an empty result for passive merge nodes", async () => {
    const result = await mergeNodeHandler.execute(input({
      type: "merge",
      name: "Merge",
      mode: "wait-all",
    }, { trigger: {}, steps: {}, variables: {} }));

    assert.deepEqual(result, {});
  });

  it("reads event-listener payloads from execution context", async () => {
    const result = await eventListenerNodeHandler.execute(input({
      type: "event-listener",
      name: "Listen",
      eventName: "invoice.created",
    }, {
      trigger: {},
      steps: {},
      variables: {},
      _event_payloads: { "invoice.created": { id: "inv_1" } },
    }));

    assert.deepEqual(result, { id: "inv_1" });
  });

  it("returns the virtual trigger marker", async () => {
    const result = await triggerNodeHandler.execute(input({
      type: "trigger",
      name: "Trigger",
    }, { trigger: {}, steps: {}, variables: {} }));

    assert.deepEqual(result, { type: "trigger" });
  });
});
