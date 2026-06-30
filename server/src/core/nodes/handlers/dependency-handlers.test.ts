import assert from "node:assert/strict";
import http from "node:http";
import { describe, it } from "node:test";

import { codeNodeHandler } from "./code.ts";
import { eventNodeHandler } from "./event.ts";
import { httpNodeHandler } from "./http.ts";
import { respondWebhookNodeHandler } from "./respond-webhook.ts";
import { callWorkflowNodeHandler } from "./call-workflow.ts";
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
    executeWorkflowFromTrigger: async () => undefined,
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

  it("executes call-workflow nodes against published callable triggers", async () => {
    const childWorkflow = {
      ...workflowWith({
        type: "trigger",
        name: "Public Form",
        trigger: { type: "form" },
      }),
      metadata: {
        ...workflowWith({ type: "trigger", name: "Trigger" }).metadata,
        id: "child-1",
        isActive: true,
        isDraft: false,
        publishedAt: "2026-06-30T00:00:00.000Z",
      },
      nodes: {
        form_trigger: {
          type: "trigger",
          name: "Public Form",
          trigger: { type: "form" },
        },
      },
    } satisfies WorkflowItem;

    const calls: any[] = [];

    const result = await callWorkflowNodeHandler.execute(input({
      type: "call-workflow",
      name: "Child",
      targetWorkflowId: "child-1",
      targetTriggerId: "form_trigger",
      toolName: "child_tool",
      inputDefaults: { source: "workflow", invoiceId: "default" },
    }, {
      trigger: {},
      steps: { "node-1": { input: { invoiceId: "inv_1" } } },
      variables: {},
    }, {
      getWorkflowById: (workflowId) => workflowId === "child-1" ? childWorkflow : null,
      executeWorkflowFromTrigger: async (...args: [WorkflowItem, string, any, string?]) => {
        calls.push(args);
        return {
          executionId: "child-exec-1",
          status: "SUCCESS",
          context: { trigger: args[2], steps: { done: { output: "ok" } } },
        };
      },
    }));

    assert.equal(calls[0][0], childWorkflow);
    assert.equal(calls[0][1], "form_trigger");
    assert.deepEqual(calls[0][2], { source: "workflow", invoiceId: "inv_1" });
    assert.match(calls[0][3], /^exec_call_node-1_/);
    assert.deepEqual(result, {
      executionId: "child-exec-1",
      status: "SUCCESS",
      output: { trigger: { source: "workflow", invoiceId: "inv_1" }, steps: { done: { output: "ok" } } },
    });
  });

  it("rejects call-workflow targets that are not published", async () => {
    const childWorkflow = {
      ...workflowWith({ type: "trigger", name: "Trigger" }),
      metadata: {
        ...workflowWith({ type: "trigger", name: "Trigger" }).metadata,
        id: "draft-child",
        isActive: false,
        isDraft: true,
        publishedAt: null,
      },
    };

    await assert.rejects(
      () => callWorkflowNodeHandler.execute(input({
        type: "call-workflow",
        name: "Child",
        targetWorkflowId: "draft-child",
        targetTriggerId: "trigger",
        toolName: "child_tool",
      }, { trigger: {}, steps: {}, variables: {} }, {
        getWorkflowById: () => childWorkflow,
      })),
      /must be published/,
    );
  });

  it("rejects call-workflow targets that are not callable trigger types", async () => {
    const childWorkflow = {
      ...workflowWith({
        type: "trigger",
        name: "Cron",
        trigger: { type: "cron", cronExpression: "* * * * *" },
      }),
      metadata: {
        ...workflowWith({ type: "trigger", name: "Trigger" }).metadata,
        id: "cron-child",
        isActive: true,
        isDraft: false,
        publishedAt: "2026-06-30T00:00:00.000Z",
      },
    };

    await assert.rejects(
      () => callWorkflowNodeHandler.execute(input({
        type: "call-workflow",
        name: "Child",
        targetWorkflowId: "cron-child",
        targetTriggerId: "node-1",
        toolName: "child_tool",
      }, { trigger: {}, steps: {}, variables: {} }, {
        getWorkflowById: () => childWorkflow,
      })),
      /not callable/,
    );
  });
});
