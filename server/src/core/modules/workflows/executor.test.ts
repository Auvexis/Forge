import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import http from "node:http";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import { resetAppDatabaseProvider, setAppDatabaseProvider } from "../app/app-repository.ts";
import { AgentToolApprovalRequiredError } from "../agent-runtime/agent-errors.ts";
import { AgentApprovalService } from "../agent-runtime/agent-approval-service.ts";
import { AgentRuntimeService } from "../agent-runtime/agent-runtime-service.ts";
import { WorkflowEngine } from "./executor.ts";
import { workflowEventBus } from "./event-bus.ts";
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
  const originalRunAgent = AgentRuntimeService.runAgent;

  beforeEach(async () => {
    appDb = await createMigratedDb("app");
    db = await createMigratedDb("workflows");
    setAppDatabaseProvider(() => appDb!);
    setWorkflowDatabaseProvider(() => db!);
  });

  afterEach(() => {
    AgentRuntimeService.runAgent = originalRunAgent;
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

  it("sets fallback workflow result from executed steps when no return node runs", async () => {
    const wf = baseWorkflow();
    WorkflowRepository.saveWorkflow(wf);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      { source: "test" },
      "exec_fallback_result",
    );

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.context.resultSource, { type: "fallback-steps" });
    assert.equal(result.context.result.steps.trigger_b.status, "SUCCESS");
    assert.deepEqual(result.context.result.steps.trigger_b.output, { source: "test" });
    assert.equal(result.context.result.steps.set_b.status, "SUCCESS");
    assert.deepEqual(result.context.result.steps.set_b.output, { branch: "b" });
    assert.equal(result.context.result.steps.set_a, undefined);
  });

  it("persists fallback workflow result in the execution log", async () => {
    const wf = baseWorkflow();
    WorkflowRepository.saveWorkflow(wf);

    await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      { source: "test" },
      "exec_fallback_result_persisted",
    );

    const execution = WorkflowRepository.getWorkflowExecutionById(
      "exec_fallback_result_persisted",
    )!;

    assert.deepEqual(execution.context_state.resultSource, { type: "fallback-steps" });
    assert.equal(execution.context_state.result.steps.trigger_b.status, "SUCCESS");
    assert.equal(execution.context_state.result.steps.set_b.output.branch, "b");
  });

  it("emits final workflow result on workflow success events", async () => {
    const wf = baseWorkflow();
    WorkflowRepository.saveWorkflow(wf);
    const events: any[] = [];
    const unsubscribe = workflowEventBus.onExecution(
      "exec_fallback_result_event",
      (event) => events.push(event),
    );

    try {
      await WorkflowEngine.executeWorkflowFromTrigger(
        wf,
        "trigger_b",
        { source: "test" },
        "exec_fallback_result_event",
      );
    } finally {
      unsubscribe();
    }

    const success = events.find((event) => event.type === "workflow:success");
    assert.ok(success);
    assert.deepEqual(success.data.resultSource, { type: "fallback-steps" });
    assert.equal(success.data.result.steps.set_b.output.branch, "b");
  });

  it("returns all executed steps and stops execution after a return node", async () => {
    const wf = baseWorkflow();
    wf.nodes.return_result = {
      type: "return",
      name: "Return Result",
      mode: "all-steps",
    };
    wf.nodes.after_return = {
      type: "set",
      name: "After Return",
      assignments: [{ key: "shouldRun", value: "no" }],
    };
    wf.edges = [
      { id: "trigger-set", source: "trigger_b", target: "set_b" },
      { id: "set-return", source: "set_b", target: "return_result" },
      { id: "return-after", source: "return_result", target: "after_return" },
    ];
    WorkflowRepository.saveWorkflow(wf);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      { source: "test" },
      "exec_return_all_steps",
    );

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.context.resultSource, {
      type: "return",
      nodeId: "return_result",
    });
    assert.equal(result.context.result.steps.set_b.output.branch, "b");
    assert.equal(result.context.result.steps.return_result, undefined);
    assert.deepEqual(result.context.steps.return_result.output, result.context.result);
    assert.equal(result.context.steps.after_return, undefined);
  });

  it("returns custom fields from templates", async () => {
    const wf = baseWorkflow();
    wf.nodes.return_result = {
      type: "return",
      name: "Return Result",
      mode: "fields",
      fields: [
        { key: "branch", value: "{{steps.set_b.output.branch}}" },
        { key: "source", value: "{{trigger.source}}" },
      ],
    };
    wf.edges = [
      { id: "trigger-set", source: "trigger_b", target: "set_b" },
      { id: "set-return", source: "set_b", target: "return_result" },
    ];
    WorkflowRepository.saveWorkflow(wf);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      { source: "test" },
      "exec_return_fields",
    );

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.context.result, { branch: "b", source: "test" });
    assert.deepEqual(result.context.steps.return_result.output, result.context.result);
  });

  it("returns a single expression value", async () => {
    const wf = baseWorkflow();
    wf.nodes.return_result = {
      type: "return",
      name: "Return Result",
      mode: "expression",
      expression: "({ branch: steps.set_b.output.branch, source: trigger.source })",
    };
    wf.edges = [
      { id: "trigger-set", source: "trigger_b", target: "set_b" },
      { id: "set-return", source: "set_b", target: "return_result" },
    ];
    WorkflowRepository.saveWorkflow(wf);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      { source: "test" },
      "exec_return_expression",
    );

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.context.result, { branch: "b", source: "test" });
    assert.deepEqual(result.context.resultSource, {
      type: "return",
      nodeId: "return_result",
    });
  });

  it("uses the first reached return when multiple return nodes are connected", async () => {
    const wf = baseWorkflow();
    wf.nodes.return_first = {
      type: "return",
      name: "Return First",
      mode: "fields",
      fields: [{ key: "winner", value: "first" }],
    };
    wf.nodes.return_second = {
      type: "return",
      name: "Return Second",
      mode: "fields",
      fields: [{ key: "winner", value: "second" }],
    };
    wf.edges = [
      { id: "trigger-first", source: "trigger_b", target: "return_first" },
      { id: "first-second", source: "return_first", target: "return_second" },
    ];
    WorkflowRepository.saveWorkflow(wf);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      { source: "test" },
      "exec_first_return_wins",
    );

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.context.result, { winner: "first" });
    assert.deepEqual(result.context.resultSource, {
      type: "return",
      nodeId: "return_first",
    });
    assert.equal(result.context.steps.return_second, undefined);
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

  it("pauses agent workflow when a called tool needs approval", async () => {
    const wf = baseWorkflow();
    wf.nodes.agent = {
      type: "ai-agent",
      name: "Agent",
      prompt: "Help",
      maxIterations: 3,
      maxToolCalls: 3,
      timeoutMs: 30000,
      requireApprovalForSideEffects: ["external-message"],
      outputMode: "text",
    };
    wf.nodes.model = {
      type: "ai-model",
      name: "Model",
      pluginId: "openai",
      adapter: "openai-compatible",
      model: "gpt-test",
      temperature: 0,
    };
    wf.nodes.tool = {
      type: "ai-tool",
      name: "Discord Send",
      pluginId: "discord",
      methodId: "sendMessage",
      timeoutMs: 30000,
      requiresApproval: true,
      sideEffect: "external-message",
    };
    wf.edges = [
      { id: "trigger-agent", source: "trigger_a", target: "agent" },
      { id: "model-agent", source: "model", target: "agent" },
      { id: "tool-agent", source: "tool", target: "agent" },
    ];
    WorkflowRepository.saveWorkflow(wf);
    AgentRuntimeService.runAgent = async () => {
      throw new AgentToolApprovalRequiredError({
        toolName: "discord_send_message",
        sideEffect: "external-message",
        args: { channelId: "123", content: "Ship it" },
      });
    };

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_a",
      { profileId: "profile_a", sessionId: "chat_1", message: "send discord" },
      "exec_waiting_approval",
    );

    const approval = db!
      .prepare(`SELECT * FROM agent_tool_approvals WHERE execution_id = ?`)
      .get("exec_waiting_approval") as any;

    assert.equal(result.status, "WAITING_APPROVAL");
    assert.equal(result.context.steps.agent.status, "WAITING_APPROVAL");
    assert.equal(approval.profile_id, "profile_a");
    assert.equal(approval.session_id, "chat_1");
    assert.equal(approval.tool_name, "discord_send_message");
    assert.equal(JSON.parse(approval.request_json).nodeId, "agent");
  });

  it("targets one published agent and skips sibling agents", async () => {
    const wf = baseWorkflow();
    wf.nodes = {
      chat_trigger: {
        type: "trigger",
        name: "Chat",
        trigger: { type: "chat", chatSlug: "support-agent" },
      },
      agent_one: {
        type: "ai-agent",
        name: "Agent One",
        prompt: "Help one",
        maxIterations: 3,
        maxToolCalls: 3,
        timeoutMs: 30000,
        requireApprovalForSideEffects: ["external-message"],
        outputMode: "text",
      },
      agent_two: {
        type: "ai-agent",
        name: "Agent Two",
        prompt: "Help two",
        maxIterations: 3,
        maxToolCalls: 3,
        timeoutMs: 30000,
        requireApprovalForSideEffects: ["external-message"],
        outputMode: "text",
      },
      model: {
        type: "ai-model",
        name: "Model",
        pluginId: "openai",
        adapter: "openai-compatible",
        model: "gpt-test",
        temperature: 0,
      },
    };
    wf.edges = [
      { id: "trigger-agent-one", source: "chat_trigger", target: "agent_one" },
      { id: "trigger-agent-two", source: "chat_trigger", target: "agent_two" },
      { id: "model-agent-one", source: "model", target: "agent_one" },
      { id: "model-agent-two", source: "model", target: "agent_two" },
    ];
    WorkflowRepository.saveWorkflow(wf);
    AgentRuntimeService.runAgent = async (input) => ({
      status: "success",
      output: input.nodeId,
      toolCallCount: 0,
      iterationCount: 1,
    });

    const executeFromTrigger = WorkflowEngine.executeWorkflowFromTrigger as any;
    const result = await executeFromTrigger(
      wf,
      "chat_trigger",
      { profileId: "profile_a", message: "Hello" },
      "exec_target_agent",
      { targetNodeId: "agent_two" },
    );

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.context.steps.agent_one, undefined);
    assert.equal(result.context.steps.agent_two.status, "SUCCESS");
  });

  it("resumes a waiting approval execution from the paused agent node", async () => {
    const wf = baseWorkflow();
    wf.nodes.agent = {
      type: "ai-agent",
      name: "Agent",
      prompt: "Help",
      maxIterations: 3,
      maxToolCalls: 3,
      timeoutMs: 30000,
      requireApprovalForSideEffects: ["external-message"],
      outputMode: "text",
    };
    wf.nodes.model = {
      type: "ai-model",
      name: "Model",
      pluginId: "openai",
      adapter: "openai-compatible",
      model: "gpt-test",
      temperature: 0,
    };
    wf.nodes.tool = {
      type: "ai-tool",
      name: "Discord Send",
      pluginId: "discord",
      methodId: "sendMessage",
      timeoutMs: 30000,
      requiresApproval: true,
      sideEffect: "external-message",
    };
    wf.edges = [
      { id: "trigger-agent", source: "trigger_a", target: "agent" },
      { id: "model-agent", source: "model", target: "agent" },
      { id: "tool-agent", source: "tool", target: "agent" },
      { id: "agent-after", source: "agent", target: "set_b" },
    ];
    WorkflowRepository.saveWorkflow(wf);
    AgentRuntimeService.runAgent = async (input) => {
      if (input.approvalToken === "approved") {
        assert.deepEqual(input.approvalToolResumeState, { marker: "loop-state" });
        return {
          status: "success",
          output: "sent",
          toolCallCount: 1,
          iterationCount: 2,
        };
      }

      throw new AgentToolApprovalRequiredError({
        toolName: "discord_send_message",
        sideEffect: "external-message",
        args: { channelId: "123", content: "Ship it" },
        resumeState: { marker: "loop-state" },
      });
    };

    await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_a",
      { profileId: "profile_a", sessionId: "chat_1", message: "send discord" },
      "exec_resume_approval",
    );
    const approvalService = new AgentApprovalService(db!);
    const approvalRow = db!
      .prepare(`SELECT id FROM agent_tool_approvals WHERE execution_id = ?`)
      .get("exec_resume_approval") as { id: string };
    const approval = approvalService.resolve("profile_a", approvalRow.id, { status: "approved" })!;

    const resumed = await WorkflowEngine.resumeExecutionAfterAgentApproval(approval);

    assert.equal(resumed.status, "SUCCESS");
    assert.equal(resumed.executionId, "exec_resume_approval");
    assert.equal(resumed.context.steps.agent.output.output, "sent");
    assert.equal(resumed.context.steps.set_b.output.branch, "b");
  });
});
