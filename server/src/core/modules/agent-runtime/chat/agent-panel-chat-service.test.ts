import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import { createMigrationEngine } from "../../../database/migration-engine.ts";
import { resetAppDatabaseProvider, setAppDatabaseProvider } from "../../app/app-repository.ts";
import {
  resetWorkflowDatabaseProvider,
  setWorkflowDatabaseProvider,
  WorkflowRepository,
} from "../../workflows/repository.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";
import { AgentPanelChatService } from "./agent-panel-chat-service.ts";

describe("agent panel chat service", () => {
  let appDb: Database.Database | null = null;
  let workflowDb: Database.Database | null = null;
  const executions: Array<{
    workflowId: string;
    triggerNodeId: string;
    payload: any;
    executionId: string | undefined;
    options: any;
  }> = [];

  beforeEach(async () => {
    executions.length = 0;
    appDb = await createMigratedDb("app");
    workflowDb = await createMigratedDb("workflows");
    setAppDatabaseProvider(() => appDb!);
    setWorkflowDatabaseProvider(() => workflowDb!);
    WorkflowRepository.saveWorkflow(workflowFixture());
  });

  afterEach(() => {
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
    appDb?.close();
    workflowDb?.close();
    appDb = null;
    workflowDb = null;
  });

  it("creates a new session for a published agent key", async () => {
    const service = serviceFixture();
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });

    assert.equal(session.agentNodeId, "agent");
    assert.equal(session.agentKey, "profile_a:workflow_agent:chat_trigger:agent");
  });

  it("uses the active profile workflow database for panel sessions by default", async () => {
    const service = new AgentPanelChatService();

    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });

    const row = workflowDb!
      .prepare(`SELECT id FROM agent_chat_sessions WHERE id = ?`)
      .get(session.id) as { id: string } | undefined;
    assert.equal(row?.id, session.id);
  });

  it("sends messages with targetAgentNodeId and previous transcript", async () => {
    const service = serviceFixture();
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });

    await service.sendMessage({ profileId: "profile_a", sessionId: session.id, message: "Boa noite" });
    await service.sendMessage({ profileId: "profile_a", sessionId: session.id, message: "What did I ask?" });

    assert.equal(executions[1].payload.targetAgentNodeId, "agent");
    assert.equal(executions[1].payload.skipFinalResponseAfterToolUse, false);
    assert.equal(executions[1].options.targetNodeId, "agent");
    assert.deepEqual(executions[1].payload.messages.map((message: any) => message.role), ["user", "assistant"]);
  });

  it("does not persist an empty assistant message when the runtime skips the final response", async () => {
    const service = serviceFixture({
      executionOutput: "",
      toolCalls: [{ toolCallId: "call_1", name: "discord_send_message", status: "success" }],
    });
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });

    const result = await service.sendMessage({
      profileId: "profile_a",
      sessionId: session.id,
      message: "Enviar resumo",
    });

    assert.deepEqual(result.messages.map((message) => ({ role: message.role, content: message.content })), [
      { role: "user", content: "Enviar resumo" },
    ]);
  });

  it("persists waiting-user output as a readable assistant question with options", async () => {
    const service = serviceFixture({
      executionOutput: {
        status: "waiting-user",
        reason: "ambiguous_result",
        question: "Encontrei varios arquivos. Qual devo usar?",
        options: [
          { id: "file_1", name: "video.mp4" },
          { id: "file_2", name: "video-final.mp4" },
        ],
      },
    });
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });

    const result = await service.sendMessage({
      profileId: "profile_a",
      sessionId: session.id,
      message: "Suba o mp4",
    });

    assert.deepEqual(result.messages.map((message) => ({ role: message.role, content: message.content })), [
      { role: "user", content: "Suba o mp4" },
      {
        role: "assistant",
        content: {
          text: "Encontrei varios arquivos. Qual devo usar?",
          waitingUser: true,
          reason: "ambiguous_result",
          options: [
            { id: "file_1", name: "video.mp4" },
            { id: "file_2", name: "video-final.mp4" },
          ],
        },
      },
    ]);
  });

  it("preserves waiting-user options in the next agent runner history payload", async () => {
    const service = serviceFixture({
      executionOutput: {
        status: "waiting-user",
        reason: "ambiguous_result",
        question: "Encontrei varios arquivos. Qual devo usar?",
        options: [
          { id: "file_1", name: "video.mp4" },
          { id: "file_2", name: "video-final.mp4" },
        ],
      },
    });
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });

    await service.sendMessage({
      profileId: "profile_a",
      sessionId: session.id,
      message: "Suba o mp4",
    });
    await service.sendMessage({
      profileId: "profile_a",
      sessionId: session.id,
      message: "Use video-final.mp4",
    });

    assert.deepEqual(executions[1].payload.messages[1], {
      role: "assistant",
      content: {
        text: "Encontrei varios arquivos. Qual devo usar?",
        waitingUser: true,
        reason: "ambiguous_result",
        options: [
          { id: "file_1", name: "video.mp4" },
          { id: "file_2", name: "video-final.mp4" },
        ],
      },
    });
  });

  it("uses a caller-provided execution id for stream subscriptions", async () => {
    const service = serviceFixture();
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });

    const result = await service.sendMessage({
      profileId: "profile_a",
      sessionId: session.id,
      message: "Stream this",
      executionId: "exec_agent_panel_stream",
    });

    assert.equal((result.execution as { executionId?: string }).executionId, "exec_agent_panel_stream");
    assert.equal(executions[0].executionId, "exec_agent_panel_stream");
  });

  it("creates the session only when the first draft message is sent", async () => {
    const service = serviceFixture();

    const result = await service.sendFirstMessage({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      message: "Start support",
    });

    assert.equal(result.session.agentKey, "profile_a:workflow_agent:chat_trigger:agent");
    assert.equal(result.session.title, "Start support");
    assert.deepEqual(result.messages.map((message) => message.role), ["user", "assistant"]);
    assert.equal(executions[0].payload.sessionId, result.session.id);
    assert.equal(executions[0].payload.targetAgentNodeId, "agent");
  });

  it("includes the workflow step failure detail in agent panel errors", async () => {
    const service = failingServiceFixture();
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });

    await assert.rejects(
      service.sendMessage({ profileId: "profile_a", sessionId: session.id, message: "Break" }),
      /agent: Invalid AI agent config/,
    );
  });

  it("deletes a session and its transcript", async () => {
    const service = serviceFixture();
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });

    await service.sendMessage({ profileId: "profile_a", sessionId: session.id, message: "Boa noite" });
    await service.deleteSession({ profileId: "profile_a", sessionId: session.id, memoryMode: "session" });

    assert.deepEqual(await service.listSessions({ profileId: "profile_a", agentKey: session.agentKey! }), []);
    assert.deepEqual(await service.listMessages({ profileId: "profile_a", sessionId: session.id }), []);
  });

  it("delete transcript-only does not delete agent memories", async () => {
    const service = serviceFixture();
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });
    insertMemory(`session:${session.id}`, "agent:agent:last-output");

    await service.deleteSession({ profileId: "profile_a", sessionId: session.id, memoryMode: "transcript-only" });

    assert.equal(countMemories(), 1);
  });

  it("delete session deletes only session scoped memory", async () => {
    const service = serviceFixture();
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });
    insertMemory(`session:${session.id}`, "agent:agent:last-output");
    insertMemory("workflow:profile_a:workflow_agent", "agent:agent:last-output");

    await service.deleteSession({ profileId: "profile_a", sessionId: session.id, memoryMode: "session" });

    assert.deepEqual(listMemoryNamespaces(), ["workflow:profile_a:workflow_agent"]);
  });

  it("delete all-agent-memory deletes session and agent-scoped long-term memories", async () => {
    const service = serviceFixture();
    const session = await service.createSession({
      profileId: "profile_a",
      agentKey: "profile_a:workflow_agent:chat_trigger:agent",
      title: "Support chat",
    });
    insertMemory(`session:${session.id}`, "agent:agent:last-output");
    insertMemory("workflow:profile_a:workflow_agent", "agent:agent:last-output");
    insertMemory("profile:profile_a", "agent:agent:last-output");
    insertMemory("profile:profile_a", "agent:other-agent:last-output");

    await service.deleteSession({ profileId: "profile_a", sessionId: session.id, memoryMode: "all-agent-memory" });

    assert.deepEqual(listMemoryKeys(), ["agent:other-agent:last-output"]);
  });

  function serviceFixture(fixtureOptions: {
    executionOutput?: unknown;
    toolCalls?: Array<Record<string, unknown>>;
  } = {}): AgentPanelChatService {
    return new AgentPanelChatService({
      db: workflowDb!,
      workflowRepository: WorkflowRepository,
      workflowEngine: {
        executeWorkflowFromTrigger: async (
          workflow: WorkflowItem,
          triggerNodeId: string,
          payload: any,
          executionId?: string,
          options?: { targetNodeId?: string },
        ) => {
          executions.push({ workflowId: workflow.metadata.id, triggerNodeId, payload, executionId, options });
          return {
            executionId: executionId ?? `exec_${executions.length}`,
            status: "SUCCESS",
            context: {
              steps: {
                agent: {
                  output: {
                    output: Object.hasOwn(fixtureOptions, "executionOutput")
                      ? fixtureOptions.executionOutput
                      : `Assistant reply ${executions.length}`,
                    ...(fixtureOptions.toolCalls ? { toolCalls: fixtureOptions.toolCalls } : {}),
                  },
                },
              },
            },
          };
        },
      },
    });
  }

  function failingServiceFixture(): AgentPanelChatService {
    return new AgentPanelChatService({
      db: workflowDb!,
      workflowRepository: WorkflowRepository,
      workflowEngine: {
        executeWorkflowFromTrigger: async () => ({
          executionId: "exec_failed",
          status: "FAILED",
          context: {
            steps: {
              agent: { error: "Invalid AI agent config" },
            },
          },
        }),
      },
    });
  }

  function insertMemory(namespace: string, key: string): void {
    const now = new Date(0).toISOString();
    workflowDb!
      .prepare(`
        INSERT INTO agent_memories
          (id, profile_id, namespace, memory_key, value_json, source, created_at, updated_at)
        VALUES (?, 'profile_a', ?, ?, '{}', 'workflow:workflow_agent', ?, ?)
      `)
      .run(`memory_${namespace}_${key}`, namespace, key, now, now);
  }

  function countMemories(): number {
    const row = workflowDb!.prepare(`SELECT COUNT(*) AS total FROM agent_memories`).get() as { total: number };
    return row.total;
  }

  function listMemoryNamespaces(): string[] {
    return (
      workflowDb!
        .prepare(`SELECT namespace FROM agent_memories ORDER BY namespace`)
        .all() as Array<{ namespace: string }>
    ).map((row) => row.namespace);
  }

  function listMemoryKeys(): string[] {
    return (
      workflowDb!
        .prepare(`SELECT memory_key FROM agent_memories ORDER BY memory_key`)
        .all() as Array<{ memory_key: string }>
    ).map((row) => row.memory_key);
  }
});

async function createMigratedDb(kind: "app" | "workflows"): Promise<Database.Database> {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  await createMigrationEngine(database, kind).up();
  return database;
}

function workflowFixture(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    metadata: {
      id: "workflow_agent",
      name: "Agent Workflow",
      version: "1",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: new Date(0).toISOString(),
    },
    trigger: { type: "manual" },
    nodes: {
      chat_trigger: {
        type: "trigger",
        name: "Chat",
        trigger: {
          type: "chat",
          chatSlug: "support-agent",
          chatTitle: "Support",
          chatAuthMode: "profile",
          chatSessionMode: "resume-by-session-id",
          chatRateLimitPerMinute: 30,
        },
      },
      agent: {
        type: "ai-agent",
        name: "Agent",
        agentDisplayName: "Support Agent",
        agentEmoji: "\u{1F916}",
        prompt: "Help users.",
        maxIterations: 4,
        maxToolCalls: 4,
        timeoutMs: 30000,
        requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
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
    },
    edges: [
      { id: "trigger-agent", source: "chat_trigger", target: "agent" },
      { id: "model-agent", source: "model", target: "agent" },
    ],
    ...overrides,
  };
}
