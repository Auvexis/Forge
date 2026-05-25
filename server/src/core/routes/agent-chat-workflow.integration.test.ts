import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";
import type { SailorPlugin } from "@auvexis/sailor-sdk";
import { createMigrationEngine } from "../database/migration-engine.ts";
import { resetAppDatabaseProvider, setAppDatabaseProvider } from "../modules/app/app-repository.ts";
import {
  resetCredentialsDatabaseProvider,
  setCredentialsDatabaseProvider,
} from "../modules/plugins/credential-store.ts";
import { AgentRunner } from "../modules/agent-runtime/agent-runner.ts";
import { AgentRuntimeService } from "../modules/agent-runtime/agent-runtime-service.ts";
import type { AgentRunInput } from "../modules/agent-runtime/agent-types.ts";
import { PluginManager } from "../modules/plugins/manager.ts";
import {
  resetWorkflowDatabaseProvider,
  setWorkflowDatabaseProvider,
  WorkflowRepository,
} from "../modules/workflows/repository.ts";
import { workflowEventBus, type WorkflowEvent } from "../modules/workflows/event-bus.ts";
import type { WorkflowItem } from "../../shared/models/workflow-types.ts";
import agentChatRoutes from "./agent-chat.routes.ts";

describe("agent chat workflow integration", () => {
  const originalRunAgent = AgentRuntimeService.runAgent;
  let appDb: Database.Database | null = null;
  let credentialsDb: Database.Database | null = null;
  let workflowDb: Database.Database | null = null;

  beforeEach(async () => {
    PluginManager.clearPlugins();
    appDb = await createMigratedDb("app");
    credentialsDb = await createMigratedDb("credentials");
    workflowDb = await createMigratedDb("workflows");
    setAppDatabaseProvider(() => appDb!);
    setCredentialsDatabaseProvider(() => credentialsDb!);
    setWorkflowDatabaseProvider(() => workflowDb!);
  });

  afterEach(() => {
    AgentRuntimeService.runAgent = originalRunAgent;
    PluginManager.clearPlugins();
    resetAppDatabaseProvider();
    resetCredentialsDatabaseProvider();
    resetWorkflowDatabaseProvider();
    appDb?.close();
    credentialsDb?.close();
    workflowDb?.close();
    appDb = null;
    credentialsDb = null;
    workflowDb = null;
  });

  it("runs a chat-triggered agent workflow with tool calls and stable session thread", async () => {
    const threadIds: string[] = [];
    const events: WorkflowEvent[] = [];
    const eventListener = (event: WorkflowEvent) => events.push(event);
    workflowEventBus.on("workflow-event", eventListener);
    try {
      PluginManager.registerPlugin(fakeNotesPlugin());
      WorkflowRepository.saveWorkflow(agentWorkflow());
      const fakeModel = createFakeModel();
      const runner = new AgentRunner({
        modelRegistry: {
          async createChatModel() {
            return fakeModel;
          },
        },
        checkpointerFactory: async ({ sessionId }) => {
          threadIds.push(sessionId);
          return { sessionId };
        },
      });
      AgentRuntimeService.runAgent = (input: AgentRunInput) => runner.run(input);

      const app = Fastify({ logger: false });
      await app.register(agentChatRoutes, {
        db: workflowDb!,
        getActiveProfileId: () => "profile_a",
      });

      const first = await app.inject({
        method: "POST",
        url: "/agent-chat/support-agent/messages",
        payload: { message: "Create a note" },
      });
      assert.equal(first.statusCode, 200);
      const firstBody = first.json();
      const sessionId = firstBody.data.session.id as string;
      assert.match(sessionId, /^chat_/);
      assert.equal(firstBody.data.assistantResponse, "Created note");

      const executions = WorkflowRepository.getWorkflowExecutions("workflow_chat_agent");
      assert.equal(executions.length, 1);
      assert.equal(events.some((event) => event.type === "agent:tool-start"), true);

      const second = await app.inject({
        method: "POST",
        url: "/agent-chat/support-agent/messages",
        payload: { sessionId, message: "What did we do?" },
      });
      assert.equal(second.statusCode, 200);

      assert.deepEqual(threadIds, [sessionId, sessionId]);
    } finally {
      workflowEventBus.off("workflow-event", eventListener);
    }
  });
});

async function createMigratedDb(kind: "app" | "credentials" | "workflows"): Promise<Database.Database> {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  await createMigrationEngine(database, kind).up();
  return database;
}

function createFakeModel() {
  let calls = 0;
  return {
    async invoke() {
      calls += 1;
      if (calls === 1) {
        return {
          content: "",
          toolCalls: [{ id: "call_1", name: "notes_create", args: { text: "Created by agent" } }],
        };
      }
      if (calls === 2) return { content: "Created note" };
      return { content: "We created a note" };
    },
  };
}

function fakeNotesPlugin(): SailorPlugin {
  return {
    id: "notes",
    manifest: {
      id: "notes",
      name: "Notes",
      version: "1.0.0",
      methods: {
        create: {
          metadata: { description: "Create a note" },
          parameters: {
            type: "object",
            additionalProperties: false,
            required: ["text"],
            properties: { text: { type: "string" } },
          },
          agentTool: {
            enabled: true,
            name: "notes_create",
            description: "Create a note",
            sideEffect: "read",
            requiresApproval: false,
            timeoutMs: 30000,
          },
        },
      },
    },
    auth: { type: "none" },
    methods: {
      create: async (params: Record<string, any>) => ({ id: "note_1", text: params.text }),
    },
  } as unknown as SailorPlugin;
}

function agentWorkflow(): WorkflowItem {
  return {
    metadata: {
      id: "workflow_chat_agent",
      name: "Chat Agent",
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
          chatAuthMode: "public",
          chatSessionMode: "resume-by-session-id",
          chatRateLimitPerMinute: 30,
        },
      },
      agent: {
        type: "ai-agent",
        name: "Agent",
        prompt: "You help with notes.",
        maxIterations: 4,
        maxToolCalls: 4,
        timeoutMs: 30000,
        requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
        outputMode: "text",
      },
      model: {
        type: "ai-model",
        name: "Fake Model",
        provider: "openai",
        model: "fake-openai",
        temperature: 0,
      },
      memory: {
        type: "ai-memory",
        name: "Session Memory",
        scope: "session",
        readEnabled: true,
        writeEnabled: false,
        maxRetrievedMemories: 4,
        maxMemoryChars: 4000,
      },
      tool: {
        type: "ai-tool",
        name: "Create Note",
        pluginId: "notes",
        methodId: "create",
        timeoutMs: 30000,
        requiresApproval: false,
        sideEffect: "read",
      },
    },
    edges: [
      { id: "trigger-agent", source: "chat_trigger", target: "agent" },
      { id: "model-agent", source: "model", target: "agent" },
      { id: "memory-agent", source: "memory", target: "agent" },
      { id: "tool-agent", source: "tool", target: "agent" },
    ],
  };
}
