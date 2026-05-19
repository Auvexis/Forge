import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import http from "node:http";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import { resetAppDatabaseProvider, setAppDatabaseProvider } from "../app/app-repository.ts";
import { WorkflowEngine } from "./executor.ts";
import {
  resetWorkflowDatabaseProvider,
  setWorkflowDatabaseProvider,
  WorkflowRepository,
} from "./repository.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

let db: Database.Database | null = null;
let appDb: Database.Database | null = null;

async function createMigratedDb(kind: "app" | "workflows"): Promise<Database.Database> {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  await createMigrationEngine(database, kind).up();
  return database;
}

function baseWorkflow(): WorkflowItem {
  return {
    metadata: {
      id: `wf-executor-${Date.now()}`,
      name: "Executor Test",
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-13T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {
      trigger_a: {
        type: "trigger",
        name: "Trigger A",
        trigger: { type: "manual" },
      },
      trigger_b: {
        type: "trigger",
        name: "Trigger B",
        trigger: { type: "manual" },
      },
      set_a: {
        type: "set",
        name: "Set A",
        assignments: [{ key: "branch", value: "a" }],
      },
      set_b: {
        type: "set",
        name: "Set B",
        assignments: [{ key: "branch", value: "b" }],
      },
    },
    edges: [
      { id: "a-to-set-a", source: "trigger_a", target: "set_a" },
      { id: "b-to-set-b", source: "trigger_b", target: "set_b" },
    ],
    variables: [],
  };
}

describe("WorkflowEngine trigger entry execution", () => {
  beforeEach(async () => {
    appDb = await createMigratedDb("app");
    db = await createMigratedDb("workflows");
    setAppDatabaseProvider(() => appDb!);
    setWorkflowDatabaseProvider(() => db!);
  });

  afterEach(() => {
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
    appDb?.close();
    db?.close();
    appDb = null;
    db = null;
  });

  it("executes only nodes downstream of the selected trigger", async () => {
    const wf = baseWorkflow();
    WorkflowRepository.saveWorkflow(wf);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      { source: "test" },
      "exec_multi_trigger_branch",
    );

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.context.steps.set_b.output.branch, "b");
    assert.equal(result.context.steps.set_a, undefined);
  });

  it("records selected trigger payload as trigger node output", async () => {
    const wf = baseWorkflow();
    WorkflowRepository.saveWorkflow(wf);

    const payload = { payload: "any", nested: { ok: true } };
    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      payload,
      "exec_multi_trigger_payload_output",
    );

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.context.trigger, payload);
    assert.deepEqual(result.context.steps.trigger_b.output, payload);
    assert.equal(result.context.steps.trigger_b.status, "SUCCESS");
  });

  it("passes through disabled normal nodes to their downstream targets", async () => {
    const wf = baseWorkflow();
    wf.nodes.disabled_mid = {
      type: "set",
      name: "Disabled Mid",
      disabled: true,
      assignments: [{ key: "ignored", value: "ignored" }],
    };
    wf.nodes.after_disabled = {
      type: "set",
      name: "After Disabled",
      assignments: [{ key: "continued", value: "yes" }],
    };
    wf.edges = [
      { id: "start-disabled", source: "trigger_a", target: "disabled_mid" },
      { id: "disabled-after", source: "disabled_mid", target: "after_disabled" },
    ];
    WorkflowRepository.saveWorkflow(wf);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_a",
      {},
      "exec_multi_trigger_disabled_pass",
    );

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.context.steps.disabled_mid, undefined);
    assert.equal(result.context.steps.after_disabled.output.continued, "yes");
  });

  it("executes nodes downstream of a matching event listener in the same workflow", async () => {
    let requests = 0;
    const server = http.createServer((req, res) => {
      requests++;
      assert.equal(req.method, "POST");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const wf = baseWorkflow();
      wf.nodes = {
        trigger_a: {
          type: "trigger",
          name: "Trigger A",
          trigger: { type: "manual" },
        },
        emit_event: {
          type: "event",
          name: "Emit Event",
          eventName: "message.sent",
          payloadParams: [],
        },
        wait_event: {
          type: "event-listener",
          name: "Wait for Event",
          eventName: "message.sent",
        },
        http_after_event: {
          type: "http",
          name: "HTTP after event",
          method: "POST",
          url: `http://127.0.0.1:${port}/after-event`,
          body: "{\"message\":\"ok\"}",
        },
      };
      wf.edges = [
        { id: "trigger-to-event", source: "trigger_a", target: "emit_event" },
        { id: "listener-to-http", source: "wait_event", target: "http_after_event" },
      ];
      WorkflowRepository.saveWorkflow(wf);

      const result = await WorkflowEngine.executeWorkflowFromTrigger(
        wf,
        "trigger_a",
        {},
        "exec_event_listener_downstream",
      );

      assert.equal(result.status, "SUCCESS");
      assert.equal(requests, 1);
      assert.equal(result.context.steps.wait_event.status, "SUCCESS");
      assert.equal(result.context.steps.http_after_event.status, "SUCCESS");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("continues the exported event-listener branch shape into the HTTP node", async () => {
    let requests = 0;
    const server = http.createServer((_req, res) => {
      requests++;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const wf: WorkflowItem = {
        metadata: {
          id: "wf-exported-event-http",
          name: "Workflow Date",
          version: "1.0.7",
          isActive: true,
          isDraft: false,
          public: false,
          createdAt: "2026-05-19T01:54:44.217Z",
        },
        trigger: { type: "manual" },
        nodes: {
          trigger_0: {
            type: "trigger",
            name: "Trigger",
            trigger: { type: "manual", cronExpression: "* * * * *" },
          },
          event_1: {
            type: "event",
            name: "Emit Event",
            eventName: "message.sent",
            payloadParams: [],
          },
          "event-listener_1": {
            type: "event-listener",
            name: "Wait for Event",
            eventName: "message.sent",
          },
          http_1: {
            type: "http",
            name: "HTTP Request",
            url: `http://127.0.0.1:${port}/after-event`,
            method: "POST",
            body: "{ \"message\": \"Hello World!\" }",
          },
        },
        edges: [
          {
            id: "e-trigger_0-event_1",
            source: "trigger_0",
            target: "event_1",
            sourceHandle: "source",
            targetHandle: "target",
          },
          {
            id: "e-event-listener_1-http_1",
            source: "event-listener_1",
            target: "http_1",
            sourceHandle: "source",
            targetHandle: "target",
          },
        ],
        variables: [],
      };
      WorkflowRepository.saveWorkflow(wf);

      const result = await WorkflowEngine.executeWorkflowFromTrigger(
        wf,
        "trigger_0",
        {},
        "exec_exported_event_http",
      );

      assert.equal(result.status, "SUCCESS");
      assert.equal(requests, 1);
      assert.equal(result.context.steps["event-listener_1"].status, "SUCCESS");
      assert.equal(result.context.steps.http_1.status, "SUCCESS");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("rejects disabled trigger nodes", async () => {
    const wf = baseWorkflow();
    wf.nodes.trigger_b.disabled = true;

    await assert.rejects(
      WorkflowEngine.executeWorkflowFromTrigger(
        wf,
        "trigger_b",
        {},
        "exec_multi_trigger_disabled_trigger",
      ),
      /disabled/,
    );
  });
});
