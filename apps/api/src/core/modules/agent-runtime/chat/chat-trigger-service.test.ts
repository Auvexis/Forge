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
import { ChatTriggerService } from "./chat-trigger-service.ts";

describe("chat trigger service", () => {
  let appDb: Database.Database | null = null;
  let workflowDb: Database.Database | null = null;
  const executions: Array<{ workflowId: string; triggerNodeId: string; payload: any }> = [];

  beforeEach(async () => {
    executions.length = 0;
    appDb = await createMigratedDb("app");
    workflowDb = await createMigratedDb("workflows");
    setAppDatabaseProvider(() => appDb!);
    setWorkflowDatabaseProvider(() => workflowDb!);
  });

  afterEach(() => {
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
    appDb?.close();
    workflowDb?.close();
    appDb = null;
    workflowDb = null;
  });

  it("resolves workflow by chatSlug and creates a new chat session on first message", async () => {
    WorkflowRepository.saveWorkflow(workflowFixture());
    const service = serviceFixture();

    const result = await service.sendMessage({
      profileId: "profile_1",
      chatSlug: "support-agent",
      message: "Hello",
      metadata: { origin: "test" },
    });

    assert.match(result.session.id, /^chat_/);
    assert.equal(result.session.workflowId, "workflow_chat");
    assert.equal(result.messages.at(-1)?.role, "user");
    assert.equal(executions[0].workflowId, "workflow_chat");
    assert.equal(executions[0].triggerNodeId, "chat_trigger");
  });

  it("resumes session only when profile, workflow, and session match", async () => {
    WorkflowRepository.saveWorkflow(workflowFixture());
    const service = serviceFixture();
    const first = await service.sendMessage({
      profileId: "profile_1",
      chatSlug: "support-agent",
      message: "First",
    });

    const resumed = await service.sendMessage({
      profileId: "profile_1",
      chatSlug: "support-agent",
      sessionId: first.session.id,
      message: "Second",
    });

    assert.equal(resumed.session.id, first.session.id);
    assert.equal(resumed.messages.length, 2);

    await assert.rejects(
      service.sendMessage({
        profileId: "profile_2",
        chatSlug: "support-agent",
        sessionId: first.session.id,
        message: "Wrong profile",
      }),
      /session/i,
    );
  });

  it("creates trigger payload with message, session id, user id, and metadata", async () => {
    WorkflowRepository.saveWorkflow(workflowFixture());
    const service = serviceFixture();

    const result = await service.sendMessage({
      profileId: "profile_1",
      chatSlug: "support-agent",
      userId: "user_1",
      message: "Payload please",
      metadata: { origin: "unit-test" },
    });

    assert.deepEqual(executions[0].payload, {
      type: "chat",
      profileId: "profile_1",
      workflowId: "workflow_chat",
      triggerNodeId: "chat_trigger",
      sessionId: result.session.id,
      userId: "user_1",
      message: "Payload please",
      messages: [],
      metadata: { origin: "unit-test" },
    });
  });

  it("persists and replays canonical tool-call history", async () => {
    WorkflowRepository.saveWorkflow(workflowFixture());
    const payloads: any[] = [];
    const service = new ChatTriggerService({
      db: workflowDb!,
      workflowRepository: WorkflowRepository,
      workflowEngine: {
        executeWorkflowFromTrigger: async (_workflow, _triggerNodeId, payload) => {
          payloads.push(payload);
          return {
            executionId: `exec_${payloads.length}`,
            status: "SUCCESS",
            context: {
              steps: {
                agent: {
                  output: {
                    output: "Arquivo baixado.",
                    conversationMessages: [
                      {
                        role: "assistant",
                        content: "",
                        tool_calls: [{
                          id: "call_1",
                          name: "drive_download",
                          arguments: { fileId: "file_1" },
                        }],
                      },
                      {
                        role: "tool",
                        name: "drive_download",
                        tool_call_id: "call_1",
                        content: "{\"ref\":\"artifact://artifact_1\"}",
                      },
                    ],
                  },
                },
              },
            },
          };
        },
      },
    });

    const first = await service.sendMessage({
      profileId: "profile_1",
      chatSlug: "support-agent",
      message: "Baixe o arquivo",
    });
    await service.sendMessage({
      profileId: "profile_1",
      chatSlug: "support-agent",
      sessionId: first.session.id,
      message: "E agora?",
    });

    assert.deepEqual(payloads[1].messages.slice(1, 3), [
      {
        role: "assistant",
        content: "",
        tool_calls: [{
          id: "call_1",
          name: "drive_download",
          arguments: { fileId: "file_1" },
        }],
      },
      {
        role: "tool",
        name: "drive_download",
        tool_call_id: "call_1",
        content: "{\"ref\":\"artifact://artifact_1\"}",
      },
    ]);
  });

  it("returns a debuggable error when the published chat workflow fails", async () => {
    WorkflowRepository.saveWorkflow(workflowFixture());
    const service = new ChatTriggerService({
      db: workflowDb!,
      workflowRepository: WorkflowRepository,
      workflowEngine: {
        executeWorkflowFromTrigger: async () => ({
          executionId: "exec_failed_1",
          status: "FAILED",
          context: {
            steps: {
              error: "Node ai-agent_1 failed after 1 attempt(s). Last error: Missing model credentials",
              "ai-agent_1": {
                status: "FAILED",
                error: "Missing model credentials",
              },
            },
          },
        }),
      },
    });

    await assert.rejects(
      service.sendMessage({
        profileId: "profile_1",
        chatSlug: "support-agent",
        message: "Hello",
      }),
      /exec_failed_1.*Missing model credentials/,
    );
  });

  it("rejects disabled workflows", async () => {
    WorkflowRepository.saveWorkflow(workflowFixture({
      metadata: { ...workflowFixture().metadata, isActive: false },
    }));
    const service = serviceFixture();

    await assert.rejects(
      service.sendMessage({
        profileId: "profile_1",
        chatSlug: "support-agent",
        message: "Nope",
      }),
      /active workflow/i,
    );
  });

  it("rate limits public chat triggers", async () => {
    WorkflowRepository.saveWorkflow(workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        chat_trigger: {
          type: "trigger",
          name: "Chat",
          trigger: {
            type: "chat",
            chatSlug: "support-agent",
            chatTitle: "Support",
            chatAuthMode: "public",
            chatSessionMode: "resume-by-session-id",
            chatRateLimitPerMinute: 1,
          },
        },
      },
    }));
    const service = serviceFixture();

    await service.sendMessage({
      profileId: "profile_1",
      chatSlug: "support-agent",
      message: "One",
      remoteAddress: "127.0.0.1",
    });

    await assert.rejects(
      service.sendMessage({
        profileId: "profile_1",
        chatSlug: "support-agent",
        message: "Two",
        remoteAddress: "127.0.0.1",
      }),
      /rate limit/i,
    );
  });

  function serviceFixture(): ChatTriggerService {
    return new ChatTriggerService({
      db: workflowDb!,
      workflowRepository: WorkflowRepository,
      workflowEngine: {
        executeWorkflowFromTrigger: async (workflow, triggerNodeId, payload) => {
          executions.push({ workflowId: workflow.metadata.id, triggerNodeId, payload });
          return { executionId: `exec_${executions.length}`, status: "SUCCESS", context: {} };
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
      id: "workflow_chat",
      name: "Chat workflow",
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
    },
    edges: [],
    ...overrides,
  };
}
