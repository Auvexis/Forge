import assert from "node:assert/strict";
import http from "node:http";
import { describe, it } from "node:test";

import { codeNodeHandler } from "./code.ts";
import { eventNodeHandler } from "./event.ts";
import { httpNodeHandler } from "./http.ts";
import { respondWebhookNodeHandler } from "./respond-webhook.ts";
import { subWorkflowNodeHandler } from "./subworkflow.ts";
import type {
  NodeHandlerInput,
  NodeHandlerServices,
  WorkflowExecutionContext,
} from "../types.ts";
import type { WorkflowItem, WorkflowNode } from "../../../shared/models/workflow-types.ts";

function workflowWith(node: WorkflowNode): WorkflowItem {
  return {
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
  };
}

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
  node: WorkflowNode,
  context: WorkflowExecutionContext,
  overrides: Partial<NodeHandlerServices> = {},
): NodeHandlerInput {
  return {
    nodeId: "node-1",
    node,
    context,
    workflow: workflowWith(node),
    edges: [],
    executionId: "exec-1",
    services: services(overrides),
  };
}

describe("dependency-backed utility node handlers", () => {
  it("runs code nodes and merges mutated variables back into context", async () => {
    const context = { trigger: { amount: 21 }, steps: {}, variables: { seen: false } };

    const result = await codeNodeHandler.execute(input({
      type: "code",
      name: "Code",
      language: "javascript",
      script: "variables.seen = true; return context.trigger.amount * 2;",
    }, context));

    assert.equal(result.output, 42);
    assert.equal(context.variables.seen, true);
  });

  it("executes http nodes with interpolated URL values", async () => {
    const server = http.createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ url: req.url }));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.equal(typeof address, "object");

    try {
      const port = (address as { port: number }).port;
      const result = await httpNodeHandler.execute(input({
        type: "http",
        name: "HTTP",
        method: "GET",
        url: `http://127.0.0.1:${port}/orders/{{ trigger.orderId }}`,
      }, { trigger: { orderId: "ord_1" }, steps: {}, variables: {} }));

      assert.equal(result.status, 200);
      assert.deepEqual(result.data, { url: "/orders/ord_1" });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("fails http nodes when the response status is not 2xx", async () => {
    const server = http.createServer((_req, res) => {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.equal(typeof address, "object");

    try {
      const port = (address as { port: number }).port;
      await assert.rejects(
        () => httpNodeHandler.execute(input({
          type: "http",
          name: "HTTP",
          method: "GET",
          url: `http://127.0.0.1:${port}/wrong-method`,
        }, { trigger: {}, steps: {}, variables: {} })),
        /HTTP request failed with status 405/,
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("emits internal events through injected services", async () => {
    const emitted: any[] = [];

    const result = await eventNodeHandler.execute(input({
      type: "event",
      name: "Emit",
      eventName: "invoice.created",
      payloadParams: [{ key: "invoiceId", value: "{{ trigger.id }}" }],
    }, { trigger: { id: "inv_1" }, steps: {}, variables: {}, _workflowId: "workflow-1" }, {
      emitInternalEvent: async (event) => {
        emitted.push(event);
        return { triggered: ["exec-event-1"] };
      },
    }));

    assert.deepEqual(result, {
      eventName: "invoice.created",
      payload: { invoiceId: "inv_1" },
      triggered: ["exec-event-1"],
    });
    assert.equal(emitted[0].emittedBy, "workflow-1");
  });

  it("resolves pending webhook responses through injected services", async () => {
    let response: any;

    const result = await respondWebhookNodeHandler.execute(input({
      type: "respond-webhook",
      name: "Respond",
      statusCode: 201,
      body: "{\"id\":\"{{ trigger.id }}\"}",
      headers: { "x-test": "yes" },
    }, {
      trigger: { id: "created_1" },
      steps: {},
      variables: {},
      _webhookCorrelationId: "corr-1",
    }, {
      resolvePendingWebhookResponse: (_correlationId, pendingResponse) => {
        response = pendingResponse;
        return true;
      },
    }));

    assert.deepEqual(response, {
      statusCode: 201,
      body: { id: "created_1" },
      headers: { "x-test": "yes" },
    });
    assert.deepEqual(result, { statusCode: 201, body: { id: "created_1" }, resolved: true });
  });

  it("executes call-workflow nodes by loading the child workflow through services", async () => {
    const childWorkflow = workflowWith({ type: "trigger", name: "Trigger" });

    const result = await subWorkflowNodeHandler.execute(input({
      type: "call-workflow",
      name: "Child",
      targetWorkflowId: "child-1",
      targetTriggerId: "manual",
      toolName: "child_tool",
      inputDefaults: { invoiceId: "trigger.invoice.id" },
    }, { trigger: { invoice: { id: "inv_1" } }, steps: {}, variables: {} }, {
      getWorkflowById: (workflowId) => workflowId === "child-1" ? childWorkflow : null,
      executeWorkflow: async (_workflow, triggerPayload) => ({
        context: { trigger: triggerPayload, steps: { done: true } },
      }),
    }));

    assert.deepEqual(result, {
      trigger: { invoiceId: "inv_1" },
      steps: { done: true },
    });
  });
});
