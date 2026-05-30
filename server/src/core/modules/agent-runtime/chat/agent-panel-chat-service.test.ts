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
  const executions: Array<{ workflowId: string; triggerNodeId: string; payload: any; options: any }> = [];

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
    assert.equal(executions[1].options.targetNodeId, "agent");
    assert.deepEqual(executions[1].payload.messages.map((message: any) => message.role), ["user", "assistant"]);
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

  function serviceFixture(): AgentPanelChatService {
    return new AgentPanelChatService({
      db: workflowDb!,
      workflowRepository: WorkflowRepository,
      workflowEngine: {
        executeWorkflowFromTrigger: async (
          workflow: WorkflowItem,
          triggerNodeId: string,
          payload: any,
          _executionId?: string,
          options?: { targetNodeId?: string },
        ) => {
          executions.push({ workflowId: workflow.metadata.id, triggerNodeId, payload, options });
          return {
            executionId: `exec_${executions.length}`,
            status: "SUCCESS",
            context: {
              steps: {
                agent: { output: { output: `Assistant reply ${executions.length}` } },
              },
            },
          };
        },
      },
    });
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
        agentDescription: "Answers support questions.",
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
