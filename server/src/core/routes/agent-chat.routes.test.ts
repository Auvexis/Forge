import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import Fastify from "fastify";
import { createMigrationEngine } from "../database/migration-engine.ts";
import { AgentMemoryStore } from "../modules/agent-runtime/memory/agent-memory-store.ts";
import { AgentApprovalService } from "../modules/agent-runtime/agent-approval-service.ts";
import { AgentRuntimeError } from "../modules/agent-runtime/agent-errors.ts";
import type { SailorAgentToolDefinition } from "../modules/agent-runtime/plugin-tool-adapter.ts";
import agentChatRoutes from "./agent-chat.routes.ts";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";

let db: Database.Database | null = null;

describe("agent chat routes", () => {
  beforeEach(async () => {
    db?.close();
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createMigrationEngine(db, "workflows").up();
  });

  it("public chat message returns session id and assistant response", async () => {
    const app = await buildApp({
      chatService: {
        sendMessage: async () => ({
          session: session("chat_1"),
          messages: [chatMessage("msg_1", "chat_1", "Hi")],
          execution: { status: "SUCCESS", context: { steps: { agent: { output: { output: "Hello" } } } } },
        }),
        getSession: () => null,
        listMessages: () => [],
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-chat/support/messages",
      payload: { message: "Hi" },
    });
    const body = response.json() as ApiResponse<any>;

    assert.equal(response.statusCode, 200);
    assert.equal(body.data.session.id, "chat_1");
    assert.equal(body.data.assistantResponse, "Hello");
  });

  it("invalid slug returns 404", async () => {
    const app = await buildApp({
      chatService: {
        sendMessage: async () => {
          throw new AgentRuntimeError(
            "No active workflow found for this chat",
            "AGENT_CHAT_TRIGGER_NOT_FOUND",
            "No active workflow found for this chat",
            404,
          );
        },
        getSession: () => null,
        listMessages: () => [],
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-chat/missing/messages",
      payload: { message: "Hi" },
    });

    assert.equal(response.statusCode, 404);
    assert.match(response.json().error, /No active workflow/);
  });

  it("invalid payload returns 400 without stack trace", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/agent-chat/support/messages",
      payload: { message: "" },
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.json().error, /Invalid chat message/);
    assert.doesNotMatch(JSON.stringify(response.json()), /stack/i);
  });

  it("tool list does not expose credentials", async () => {
    const app = await buildApp({
      runtimeService: {
        listTools: () => [
          {
            name: "lookup",
            description: "Lookup",
            pluginId: "plugin",
            methodId: "lookup",
            inputSchema: { type: "object", properties: { q: { type: "string" } } },
            sideEffect: "read",
            requiresApproval: false,
            timeoutMs: 30000,
            credentialId: "secret_credential",
          } as SailorAgentToolDefinition & { credentialId: string },
        ],
      },
    });

    const response = await app.inject({ method: "GET", url: "/agent-tools" });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.stringify(response.json()).includes("secret_credential"), false);
  });

  it("memory list is profile-scoped", async () => {
    const store = new AgentMemoryStore(db!);
    store.put({
      id: "memory_1",
      profileId: "profile_a",
      namespace: "profile:profile_a",
      key: "one",
      value: "visible",
      source: "test",
    });
    store.put({
      id: "memory_2",
      profileId: "profile_b",
      namespace: "profile:profile_b",
      key: "two",
      value: "hidden",
      source: "test",
    });
    const app = await buildApp({ getActiveProfileId: () => "profile_a" });

    const response = await app.inject({ method: "GET", url: "/agent-memory" });
    const values = response.json().data.map((record: any) => record.value);

    assert.deepEqual(values, ["visible"]);
  });

  it("approval endpoints require matching profile and execution", async () => {
    const approvals = new AgentApprovalService(db!);
    approvals.create({
      id: "approval_1",
      profileId: "profile_a",
      workflowId: "workflow_1",
      executionId: "exec_1",
      toolName: "send_email",
      request: { to: "a@example.com" },
    });
    const app = await buildApp({
      getActiveProfileId: () => "profile_a",
      workflowEngine: {
        resumeExecutionAfterAgentApproval: async (approval) => ({
          executionId: approval.executionId,
          status: "SUCCESS",
          context: null,
        }),
      },
    });

    const wrongExecution = await app.inject({
      method: "POST",
      url: "/agent-approvals/approval_1/approve",
      payload: { executionId: "exec_other" },
    });
    assert.equal(wrongExecution.statusCode, 404);

    const approved = await app.inject({
      method: "POST",
      url: "/agent-approvals/approval_1/approve",
      payload: { executionId: "exec_1" },
    });
    assert.equal(approved.statusCode, 200);
    assert.equal(approved.json().data.status, "approved");
  });

  it("approval approve endpoint resumes workflow with the resolved approval", async () => {
    const approvals = new AgentApprovalService(db!);
    approvals.create({
      id: "approval_resume",
      profileId: "profile_a",
      workflowId: "workflow_1",
      executionId: "exec_resume",
      toolName: "send_email",
      request: { nodeId: "agent" },
    });
    let resumedStatus: string | undefined;
    const app = await buildApp({
      getActiveProfileId: () => "profile_a",
      workflowEngine: {
        resumeExecutionAfterAgentApproval: async (approval) => {
          resumedStatus = approval.status;
          return { executionId: approval.executionId, status: "SUCCESS", context: { steps: {} } };
        },
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-approvals/approval_resume/approve",
      payload: { executionId: "exec_resume" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(resumedStatus, "approved");
    assert.equal(response.json().data.execution.status, "SUCCESS");
  });

  it("approval endpoints return structured errors when resolution fails", async () => {
    const approvals = new AgentApprovalService(db!);
    approvals.create({
      id: "approval_error",
      profileId: "profile_a",
      workflowId: "workflow_1",
      executionId: "exec_error",
      toolName: "send_email",
      request: { nodeId: "agent" },
    });
    const app = await buildApp({
      getActiveProfileId: () => "profile_a",
      workflowEngine: {
        resumeExecutionAfterAgentApproval: async () => {
          throw new Error("Execution exec_error was not found");
        },
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-approvals/approval_error/approve",
      payload: { executionId: "exec_error" },
    });

    assert.equal(response.statusCode, 409);
    assert.match(response.json().error, /Execution exec_error was not found/);
    assert.doesNotMatch(JSON.stringify(response.json()), /stack/i);
  });

  it("approval endpoints use the active workflow database when no test database is injected", () => {
    const source = readFileSync(resolve(import.meta.dirname, "agent-chat.routes.ts"), "utf8");

    assert.match(source, /options\.db \?\? WorkflowRepository\.database\(\)/);
    assert.doesNotMatch(source, /options\.db \?\? DatabaseManager\.workflows/);
  });
});

async function buildApp(options: Partial<Parameters<typeof agentChatRoutes>[1]> = {}) {
  const app = Fastify({ logger: false });
  await app.register(agentChatRoutes, {
    db: db!,
    getActiveProfileId: () => "profile_a",
    chatService: {
      sendMessage: async () => ({
        session: session("chat_1"),
        messages: [],
        execution: { status: "SUCCESS" },
      }),
      getSession: () => null,
      listMessages: () => [],
    },
    runtimeService: { listTools: () => [] },
    ...options,
  });
  return app;
}

function session(id: string) {
  return {
    id,
    profileId: "profile_a",
    workflowId: "workflow_1",
    triggerNodeId: "trigger",
    title: "Chat",
    status: "active",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function chatMessage(id: string, sessionId: string, content: string) {
  return {
    id,
    profileId: "profile_a",
    sessionId,
    role: "user" as const,
    content,
    createdAt: new Date(0).toISOString(),
  };
}
