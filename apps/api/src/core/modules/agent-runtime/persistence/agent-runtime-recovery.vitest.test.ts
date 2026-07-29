import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createInteractions } from "../../../database/migrations/workflows/008_agent_pending_interactions.ts";
import { up as addRunLeases } from "../../../database/migrations/workflows/011_agent_run_leases.ts";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "../mcp/internal-mcp-server.ts";
import { runMcpAgentLoop } from "../loop/mcp-agent-loop.ts";
import { AgentRunRepository } from "./agent-run-repository.ts";
import { AgentRuntimeStateStore } from "./agent-runtime-state-store.ts";
import type { AgentRunInput } from "../agent-types.ts";
import { AgentRunner } from "../agent-runner.ts";

describe("agent runtime recovery", () => {
  it("routes a pending reply before model intent classification", async () => {
    const db = await database();
    const initialStore = new AgentRuntimeStateStore(db);
    const firstInput = runInput("Envie o arquivo");
    initialStore.startRun("run_cancel", firstInput);
    initialStore.markRunRunning();
    initialStore.createPendingInteraction({
      id: "interaction_cancel",
      kind: "clarification",
      question: "Qual arquivo?",
      context: { source: "intent", originalUserMessage: firstInput.userMessage },
    });
    initialStore.markRunWaitingUser();
    const runner = new AgentRunner({
      stateStoreFactory: () => new AgentRuntimeStateStore(db),
      modelRegistry: {
        createChatModel: async () => {
          throw new Error("intent model must not run");
        },
      },
      emitEvent: () => undefined,
    });

    const result = await runner.run({ ...firstInput, userMessage: "cancelar" });

    expect(result).toMatchObject({ status: "cancelled", output: "Operação cancelada." });
    expect(new AgentRunRepository(db).getById("profile_1", "run_cancel")?.state).toBe("cancelled");
  });

  it("resumes a clarification from durable state after restart", async () => {
    const db = await database();
    const firstStore = new AgentRuntimeStateStore(db);
    const input = runInput("Envie o arquivo para Y");
    firstStore.startRun("run_1", input);
    firstStore.markRunRunning();

    const first = await runMcpAgentLoop({
      model: {
        invokeJson: async <T extends object>() =>
          ({ action: "clarify", question: "Qual é o email de Y?" }) as T,
        generateFinalResponse: async () => "",
      },
      client: client(async () => ({ messageId: "unused" })),
      systemPrompt: "",
      userMessage: input.userMessage,
      contextMessages: [],
      actions: [action()],
      maxToolCalls: 2,
      emitEvent: () => undefined,
      state: firstStore,
    });
    firstStore.markRunWaitingUser();

    expect(first.status).toBe("waiting-user");

    const resumedStore = new AgentRuntimeStateStore(db);
    const pending = resumedStore.findPendingInteraction(input);
    expect(pending).toMatchObject({ kind: "clarification", runId: "run_1" });
    resumedStore.resumeRun(input.profileId, pending!.runId);
    resumedStore.resolvePendingInteraction(input.profileId, pending!.id, "y@example.com");
    resumedStore.markRunRunning();

    const second = await runMcpAgentLoop({
      model: {
        invokeJson: async <T extends object>() =>
          ({ action: "call", arguments: { to: "y@example.com" } }) as T,
        generateFinalResponse: async () => "Enviado.",
      },
      client: client(async () => ({ messageId: "mail_1" })),
      systemPrompt: "",
      userMessage: "y@example.com",
      contextMessages: [{ role: "user", content: input.userMessage }],
      actions: [],
      resumeState: pending!.context.resumeState,
      maxToolCalls: 2,
      emitEvent: () => undefined,
      state: resumedStore,
    });
    resumedStore.markRunCompleted();

    expect(second).toMatchObject({ status: "success", toolCallCount: 1 });
    expect(new AgentRunRepository(db).getById("profile_1", "run_1")?.state).toBe("completed");
  });

  it("persists ambiguous tool results as selections", async () => {
    const db = await database();
    const store = new AgentRuntimeStateStore(db);
    const input = runInput("Baixe X.mp4");
    store.startRun("run_2", input);
    store.markRunRunning();

    const result = await runMcpAgentLoop({
      model: {
        invokeJson: async <T extends object>() =>
          ({ action: "call", arguments: { name: "X.mp4" } }) as T,
        generateFinalResponse: async () => "",
      },
      client: client(async () => ({
        status: "multiple_matches",
        question: "Qual arquivo?",
        items: [{ id: "1" }, { id: "2" }],
      })),
      systemPrompt: "",
      userMessage: input.userMessage,
      contextMessages: [],
      actions: [action()],
      maxToolCalls: 2,
      emitEvent: () => undefined,
      state: store,
    });
    store.markRunWaitingUser();

    expect(result.status).toBe("waiting-user");
    expect(store.findPendingInteraction(input)).toMatchObject({
      kind: "selection",
      question: "Qual arquivo?",
    });
  });
});

async function database(): Promise<Database.Database> {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  await createRuns(db);
  await createInteractions(db);
  await addRunLeases(db);
  return db;
}

function client(invoke: (args: Record<string, unknown>) => Promise<unknown>): InternalMcpClient {
  return new InternalMcpClient(new InternalMcpServer([{
    name: "email_send",
    summary: "Send email",
    sideEffect: "external-message",
    requiresApproval: false,
    timeoutMs: 30_000,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        to: { type: "string" },
        name: { type: "string" },
      },
    },
    invoke,
  }]));
}

function action() {
  return {
    id: "email",
    toolName: "email_send",
    objective: "Send the file",
    dependsOn: [],
  };
}

function runInput(userMessage: string): AgentRunInput {
  return {
    profileId: "profile_1",
    workflowId: "workflow_1",
    executionId: "execution_1",
    nodeId: "agent_1",
    sessionId: "session_1",
    userMessage,
    triggerPayload: {},
    agent: {
      type: "ai-agent",
      name: "Agent",
      prompt: "Help",
      executionMode: "loop",
      maxToolCalls: 2,
      maxRetriesPerTool: 1,
      timeoutMs: 30_000,
      requireApprovalForSideEffects: [],
      outputMode: "text",
    },
    model: {
      type: "ai-model",
      name: "Model",
      pluginId: "model",
      adapter: "openai-compatible",
      model: "test",
      temperature: 0,
    },
    tools: [],
  };
}
