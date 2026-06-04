import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import Fastify from "fastify";
import agentPanelRoutes from "./agent-panel.routes.ts";
import { AgentRuntimeError } from "../modules/agent-runtime/agent-errors.ts";
import type { AgentPanelChatService } from "../modules/agent-runtime/chat/agent-panel-chat-service.ts";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { workflowEventBus } from "../modules/workflows/event-bus.ts";

describe("agent panel routes", () => {
  it("cancels active stream executions when the client connection closes", () => {
    const source = readFileSync("src/core/routes/agent-panel.routes.ts", "utf8");

    assert.match(source, /CancellationRegistry\.cancel\(executionId\)/);
    assert.match(source, /let streamFinished = false/);
    assert.match(source, /if \(!streamFinished\) CancellationRegistry\.cancel\(executionId\)/);
  });

  it("exposes agent panel endpoints with API envelopes", async () => {
    const calls: string[] = [];
    const app = await buildApp({
      listAgents: async ({ scope }) => {
        calls.push(`listAgents:${scope}`);
        return [];
      },
      listSessions: async () => [session("chat_1")],
      createSession: async () => session("chat_new"),
      listMessages: async () => [message("msg_1", "chat_1")],
      sendFirstMessage: async () => ({
        session: session("chat_first"),
        messages: [message("msg_first", "chat_first")],
        execution: { status: "SUCCESS" },
      }),
      sendMessage: async () => ({
        session: session("chat_1"),
        messages: [message("msg_1", "chat_1")],
        execution: { status: "SUCCESS" },
      }),
      deleteSession: async () => undefined,
    });
    const agentKey = encodeURIComponent("profile_a:workflow_agent:chat_trigger:agent");

    const current = await app.inject({ method: "GET", url: "/agent-panel/agents?scope=current" });
    assertEnvelope(current, 200, "Agent panel agents fetched");
    assert.deepEqual(current.json<ApiResponse<unknown[]>>().data, []);

    const global = await app.inject({ method: "GET", url: "/agent-panel/agents?scope=global" });
    assertEnvelope(global, 200, "Agent panel agents fetched");

    const sessions = await app.inject({ method: "GET", url: `/agent-panel/agents/${agentKey}/sessions` });
    assertEnvelope(sessions, 200, "Agent panel sessions fetched");

    const created = await app.inject({
      method: "POST",
      url: `/agent-panel/agents/${agentKey}/sessions`,
      payload: { title: "Support" },
    });
    assertEnvelope(created, 201, "Agent panel session created");

    const firstSent = await app.inject({
      method: "POST",
      url: `/agent-panel/agents/${agentKey}/messages`,
      payload: { message: "Hello first" },
    });
    assertEnvelope(firstSent, 200, "Agent panel message sent");

    const messages = await app.inject({ method: "GET", url: "/agent-panel/sessions/chat_1/messages" });
    assertEnvelope(messages, 200, "Agent panel messages fetched");

    const sent = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages",
      payload: { message: "Hello" },
    });
    assertEnvelope(sent, 200, "Agent panel message sent");

    const routes = app.printRoutes();
    assert.match(routes, /agent-panel\/[\s\S]*sessions\/[\s\S]*:sessionId[\s\S]*\/messages[\s\S]*\/stream/);
    assert.match(routes, /agent-panel\/[\s\S]*sessions\/[\s\S]*:sessionId[\s\S]*\/messages[\s\S]*\/stream[\s\S]*s\/[\s\S]*:streamId/);
    const routeSource = readFileSync("src/core/routes/agent-panel.routes.ts", "utf8");
    assert.match(routeSource, /Access-Control-Allow-Origin/);
    assert.match(routeSource, /flushHeaders/);
    assert.match(routeSource, /flushStreamEvent/);

    const deleted = await app.inject({
      method: "DELETE",
      url: "/agent-panel/sessions/chat_1?memoryMode=session",
    });
    assertEnvelope(deleted, 200, "Agent panel session deleted");

    assert.deepEqual(calls, ["listAgents:current", "listAgents:global"]);
  });

  it("returns useful detail for unexpected agent panel send errors", async () => {
    const app = await buildApp({
      sendMessage: async () => {
        throw new Error("Ollama connection refused");
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages",
      payload: { message: "Hello" },
    });
    const body = response.json() as ApiResponse<unknown>;

    assert.equal(response.statusCode, 500);
    assert.match(String(body.message), /Ollama connection refused/);
    assert.match(String(body.error), /Ollama connection refused/);
  });

  it("streams pending start and output deltas before done", async () => {
    const persisted: unknown[] = [];
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:output-delta",
          timestamp: Date.now(),
          data: { delta: "hel" },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:output-delta",
          timestamp: Date.now(),
          data: { delta: "lo" },
        });
        return {
          session: session("chat_1"),
          messages: [message("msg_1", "chat_1")],
          execution: { status: "SUCCESS" },
        };
      },
      appendStreamAssistantMessage: async (_input: unknown, content: unknown) => {
        persisted.push(content);
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Hello" },
    });
    const events = response.body
      .split("\n\n")
      .filter((chunk) => chunk.startsWith("data:"))
      .map((chunk) => JSON.parse(chunk.slice("data:".length).trim()) as { type: string; delta?: string; executionId?: string });

    assert.deepEqual(events.map((event) => event.type), ["start", "delta", "delta", "done"]);
    assert.equal(typeof events[0].executionId, "string");
    assert.match(events[0].executionId ?? "", /^exec_agent_panel_/);
    assert.deepEqual(events.map((event) => event.delta).filter(Boolean), ["hel", "lo"]);
    assert.deepEqual(persisted, [{ text: "hel" }, { text: "lo" }]);
  });

  it("streams approval requests as a waiting terminal state without a tool summary", async () => {
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-end",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "google_drive_download_file", pluginId: "google-drive", status: "success" },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:approval-created",
          timestamp: Date.now(),
          data: {
            approvalId: "approval_1",
            executionId: input.executionId,
            toolName: "google_gmail_send_message",
            sideEffect: "external-message",
          },
        });
        return {
          session: session("chat_1"),
          messages: [message("msg_user", "chat_1")],
          execution: { status: "WAITING_APPROVAL" },
        };
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Enviar email" },
    });
    const events = parseStreamEvents(response.body);
    const approval = events.find((event) => event.type === "approval");

    assert.equal(approval?.approvalId, "approval_1");
    assert.equal(approval?.executionId?.startsWith("exec_agent_panel_"), true);
    assert.equal(approval?.toolName, "google_gmail_send_message");
    assert.equal(events.some((event) => event.type === "summary"), false);
    assert.equal(events.some((event) => event.type === "done"), false);
    assert.equal(events.at(-1)?.type, "waiting-approval");
    assert.equal(events.at(-1)?.result?.execution?.status, "WAITING_APPROVAL");
  });

  it("starts agent panel streams with POST and reads them through EventSource-compatible GET", async () => {
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-start",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "send_discord", pluginId: "discord" },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-end",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "send_discord", pluginId: "discord", status: "success" },
        });
        return {
          session: session("chat_1"),
          messages: [
            message("msg_user", "chat_1"),
            {
              ...message("msg_assistant", "chat_1"),
              role: "assistant" as const,
              content: "Done.",
            },
          ],
          execution: { status: "SUCCESS" },
        };
      },
    });

    const started = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream/start",
      payload: { message: "Hello" },
    });
    const streamId = (started.json<ApiResponse<{ streamId: string }>>().data?.streamId ?? "");

    assert.equal(started.statusCode, 202);
    assert.ok(streamId.startsWith("agent_panel_stream_"));

    const response = await app.inject({
      method: "GET",
      url: `/agent-panel/sessions/chat_1/messages/streams/${streamId}`,
    });
    const events = parseStreamEvents(response.body);

    assert.deepEqual(events.filter((event) => event.type !== "delta").map((event) => event.type), [
      "start",
      "progress",
      "progress",
      "summary",
      "done",
    ]);
    assert.equal(events.filter((event) => event.type === "delta").map((event) => event.delta ?? "").join(""), "Preparing to use the required tools.");
    assert.equal(events.find((event) => event.type === "progress")?.status, "running");
    assert.equal(events.filter((event) => event.type === "progress")[1]?.status, "success");
    assert.equal(events.at(-1)?.type, "done");
  });

  it("streams final assistant output deltas even after tool activity", async () => {
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-start",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "lookup_customer", pluginId: "crm" },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-end",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "lookup_customer", pluginId: "crm", status: "success" },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:output-delta",
          timestamp: Date.now(),
          data: { delta: "Final answer after tool." },
        });
        return {
          session: session("chat_1"),
          messages: [
            message("msg_user", "chat_1"),
            {
              ...message("msg_assistant", "chat_1"),
              role: "assistant" as const,
              content: "Final answer after tool.",
            },
          ],
          execution: { status: "SUCCESS" },
        };
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Hello" },
    });
    const events = parseStreamEvents(response.body);

    assert.match(
      events.filter((event) => event.type === "delta").map((event) => event.delta ?? "").join(""),
      /Final answer after tool\./,
    );
    assert.equal(events.at(-1)?.type, "done");
  });

  it("streams one progress cycle for every tool call before done", async () => {
    const persisted: unknown[] = [];
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-intent",
          timestamp: Date.now(),
          data: {
            callId: "tool_call_1",
            name: "search_contacts",
            pluginId: "contacts",
            pluginName: "Contacts",
            reason: "encontrar o destinatario correto",
            requiresApproval: false,
          },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-start",
          timestamp: Date.now(),
          data: {
            callId: "tool_call_1",
            name: "search_contacts",
            pluginId: "contacts",
            pluginName: "Contacts",
          },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-end",
          timestamp: Date.now(),
          data: {
            callId: "tool_call_1",
            name: "search_contacts",
            pluginId: "contacts",
            pluginName: "Contacts",
            status: "success",
          },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-intent",
          timestamp: Date.now(),
          data: {
            callId: "tool_call_2",
            name: "send_email",
            pluginId: "gmail",
            pluginName: "Gmail",
            reason: "enviar a mensagem para o contato encontrado",
            requiresApproval: false,
          },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-start",
          timestamp: Date.now(),
          data: {
            callId: "tool_call_2",
            name: "send_email",
            pluginId: "gmail",
            pluginName: "Gmail",
          },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-end",
          timestamp: Date.now(),
          data: {
            callId: "tool_call_2",
            name: "send_email",
            pluginId: "gmail",
            pluginName: "Gmail",
            status: "success",
          },
        });

        return {
          session: session("chat_1"),
          messages: [
            message("msg_user", "chat_1"),
            {
              ...message("msg_assistant", "chat_1"),
              role: "assistant" as const,
              content: "Email enviado.",
            },
          ],
          execution: { status: "SUCCESS" },
        };
      },
      appendStreamAssistantMessage: async (_input: unknown, content: unknown) => {
        persisted.push(content);
      },
    });

    const startedAt = Date.now();
    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Enviar email" },
    });
    const durationMs = Date.now() - startedAt;

    const events = parseStreamEvents(response.body);
    const progressEvents = events.filter((event) => event.type === "progress");
    const firstDeltaIndex = events.findIndex((event) => event.type === "delta");
    const firstProgressIndex = events.findIndex((event) => event.type === "progress");
    assert.ok(firstDeltaIndex > 0 && firstDeltaIndex < firstProgressIndex);
    assert.ok(durationMs < 1000, `expected fast progress events, got ${durationMs}ms`);
    assert.deepEqual(progressEvents.map((event) => event.tool?.toolCallId), [
      "tool_call_1",
      "tool_call_1",
      "tool_call_1",
      "tool_call_2",
      "tool_call_2",
      "tool_call_2",
    ]);
    assert.deepEqual(progressEvents.map((event) => event.status), [
      "planned",
      "running",
      "success",
      "planned",
      "running",
      "success",
    ]);
    assert.equal(progressEvents[0]?.message, "Preparing to use search_contacts.");
    assert.equal(progressEvents[0]?.tool?.pluginId, "contacts");
    assert.equal(progressEvents[1]?.message, "Using search_contacts.");
    assert.equal(progressEvents[2]?.message, "search_contacts completed.");
    assert.equal(progressEvents[3]?.message, "Preparing to use send_email.");
    assert.equal(progressEvents[3]?.tool?.pluginId, "gmail");
    assert.equal(progressEvents[4]?.message, "Using send_email.");
    assert.equal(progressEvents[5]?.message, "send_email completed.");
    assert.equal(
      events.filter((event) => event.type === "delta").map((event) => event.delta ?? "").join(""),
      "Preparing to use the required tools.",
    );
    const summary = events.find((event) => event.type === "summary");
    assert.deepEqual(summary?.tools?.map((tool) => tool.toolCallId), ["tool_call_1", "tool_call_2"]);
    assert.equal(persisted.some((content: any) => content?.kind === "agentProgress"), true);
    assert.equal(persisted.some((content: any) => content?.kind === "agentSummary"), true);
    assert.equal(events.at(-1)?.type, "done");
  });

  it("streams a retry progress message before retrying a tool", async () => {
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-start",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "google_drive_list_files", pluginId: "google-drive" },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-end",
          timestamp: Date.now(),
          data: {
            callId: "tool_call_1",
            name: "google_drive_list_files",
            pluginId: "google-drive",
            status: "failed",
            error: "Validation failed for google-drive.listFiles",
          },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-retry",
          timestamp: Date.now(),
          data: {
            callId: "tool_call_1",
            name: "google_drive_list_files",
            pluginId: "google-drive",
            reason: "Nao encontrei o arquivo, vou tentar novamente",
          },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-end",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "google_drive_list_files", pluginId: "google-drive", status: "success" },
        });
        return {
          session: session("chat_1"),
          messages: [message("msg_user", "chat_1")],
          execution: { status: "SUCCESS" },
        };
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Busque meu curriculo" },
    });
    const progressEvents = parseStreamEvents(response.body).filter((event) => event.type === "progress");

    assert.deepEqual(progressEvents.map((event) => event.status), ["running", "failed", "retrying", "success"]);
    assert.equal(progressEvents[1]?.message, "google_drive_list_files failed: Validation failed for google-drive.listFiles");
    assert.equal(progressEvents[2]?.message, "Retrying google_drive_list_files.");
  });

  it("persists stream errors immediately", async () => {
    const persisted: unknown[] = [];
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId ?? "exec_1",
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:error",
          timestamp: Date.now(),
          data: { message: "Tool failed" },
        });
        return {
          session: session("chat_1"),
          messages: [message("msg_user", "chat_1")],
          execution: { status: "FAILED" },
        };
      },
      appendStreamAssistantMessage: async (_input: unknown, content: unknown) => {
        persisted.push(content);
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Break" },
    });
    const events = parseStreamEvents(response.body);

    assert.equal(events.some((event) => event.type === "error" && event.message === "Tool failed"), true);
    assert.equal((persisted[0] as any).kind, "agentError");
    assert.equal((persisted[0] as any).message, "Tool failed");
  });

  it("flushes queued progress before a terminal stream error", async () => {
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-start",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "google_drive_list_files", pluginId: "google-drive" },
        });
        throw new AgentRuntimeError(
          "Agent tool google_drive_list_files failed: Validation failed",
          "AGENT_TOOL_ARGS_INVALID",
          "Agent tool google_drive_list_files failed: Validation failed",
          400,
        );
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Find resume" },
    });
    const events = parseStreamEvents(response.body);
    const progressIndex = events.findIndex((event) => event.type === "progress");
    const errorIndex = events.findIndex((event) => event.type === "error");

    assert.ok(progressIndex >= 0);
    assert.ok(errorIndex > progressIndex);
    assert.equal(events[progressIndex]?.status, "running");
  });

  it("persists waiting-user choices from stream results", async () => {
    const persisted: unknown[] = [];
    const app = await buildApp({
      sendMessage: async () => ({
        session: session("chat_1"),
        messages: [
          message("msg_user", "chat_1"),
          {
            ...message("msg_choice", "chat_1"),
            role: "assistant",
            content: {
              text: "Qual arquivo devo usar?",
              waitingUser: true,
              reason: "ambiguous_result",
              options: [{ label: "A.pdf", value: "file_1" }],
            },
          },
        ],
        execution: { status: "SUCCESS" },
      }),
      appendStreamAssistantMessage: async (_input: unknown, content: unknown) => {
        persisted.push(content);
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Escolher arquivo" },
    });
    const events = parseStreamEvents(response.body);
    const choice = events.find((event) => event.type === "choice");

    assert.equal(choice?.question, "Qual arquivo devo usar?");
    assert.equal((persisted.find((item: any) => item?.kind === "agentChoice") as any)?.reason, "ambiguous_result");
  });

  it("streams English contextual intro and tool progress when the user message is English", async () => {
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-start",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "discord_send_message", pluginId: "discord" },
        });
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:tool-end",
          timestamp: Date.now(),
          data: { callId: "tool_call_1", name: "discord_send_message", pluginId: "discord", status: "success" },
        });
        return {
          session: session("chat_1"),
          messages: [message("msg_user", "chat_1")],
          execution: { status: "SUCCESS" },
        };
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: 'Can you send a joke about "bananas" on my Discord?' },
    });
    const events = parseStreamEvents(response.body);
    const deltaEvents = events.filter((event) => event.type === "delta");

    assert.equal(deltaEvents.map((event) => event.delta ?? "").join(""), "Preparing to use the required tools.");
    assert.equal(events.find((event) => event.type === "progress")?.message, "Using discord_send_message.");
    assert.equal(events.find((event) => event.type === "summary")?.message, "Tools used: discord_send_message.");
  });

  it("streams fallback progress from the final execution when live tool events were missed", async () => {
    const app = await buildApp({
      sendMessage: async () => ({
        session: session("chat_1"),
        messages: [
          message("msg_user", "chat_1"),
          {
            ...message("msg_assistant", "chat_1"),
            role: "assistant" as const,
            content: "Tudo enviado.",
          },
        ],
        execution: {
          status: "SUCCESS",
          context: {
            steps: {
              agent: {
                output: {
                  output: "Tudo enviado.",
                  toolCallCount: 2,
                  toolCalls: [
                    {
                      toolCallId: "tool_call_1",
                      name: "discord_send_message",
                      pluginId: "discord",
                      pluginName: "Discord",
                      status: "success",
                    },
                    {
                      toolCallId: "tool_call_2",
                      name: "google_gmail_send_message",
                      pluginId: "google-gmail",
                      pluginName: "Gmail",
                      status: "success",
                    },
                  ],
                },
              },
            },
          },
        },
      }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Enviar piada" },
    });

    const events = parseStreamEvents(response.body);
    const progressEvents = events.filter((event) => event.type === "progress");

    assert.deepEqual(progressEvents.map((event) => event.tool?.toolCallId), [
      "tool_call_1",
      "tool_call_1",
      "tool_call_1",
      "tool_call_2",
      "tool_call_2",
      "tool_call_2",
    ]);
    assert.deepEqual(progressEvents.map((event) => event.status), [
      "planned",
      "running",
      "success",
      "planned",
      "running",
      "success",
    ]);
    assert.equal(progressEvents.filter((event) => /completed\./.test(event.message ?? "")).length, 2);
    assert.equal(
      events.filter((event) => event.type === "delta").map((event) => event.delta ?? "").join(""),
      "Preparing to use the required tools.",
    );
    assert.ok(events.find((event) =>
      event.type === "summary" &&
      /discord_send_message/.test(event.message ?? "") &&
      /google_gmail_send_message/.test(event.message ?? "")
    ));
    assert.equal(events.at(-1)?.type, "done");
  });

  it("streams the final assistant message in chunks when the model did not emit native deltas", async () => {
    const app = await buildApp({
      sendMessage: async () => ({
        session: session("chat_1"),
        messages: [
          message("msg_user", "chat_1"),
          {
            ...message("msg_assistant", "chat_1"),
            role: "assistant" as const,
            content: "Hello there, this response should not arrive as one big blob.",
          },
        ],
        execution: { status: "SUCCESS" },
      }),
    });

    const startedAt = Date.now();
    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Hello" },
    });
    const elapsedMs = Date.now() - startedAt;
    const events = response.body
      .split("\n\n")
      .filter((chunk) => chunk.startsWith("data:"))
      .map((chunk) => JSON.parse(chunk.slice("data:".length).trim()) as { type: string; delta?: string });
    const deltaEvents = events.filter((event) => event.type === "delta");

    assert.ok(deltaEvents.length > 2);
    assert.ok(elapsedMs >= 50);
    assert.equal(
      deltaEvents.map((event) => event.delta ?? "").join(""),
      "Hello there, this response should not arrive as one big blob.",
    );
    assert.equal(events.at(-1)?.type, "done");
  });

  it("streams chat intent responses without progress events", async () => {
    const app = await buildApp({
      sendMessage: async () => ({
        session: session("chat_1"),
        messages: [
          message("msg_user", "chat_1"),
          {
            ...message("msg_assistant", "chat_1"),
            role: "assistant" as const,
            content: "Bonjour!",
          },
        ],
        execution: { status: "SUCCESS", toolCallCount: 0 },
      }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Bonjour" },
    });
    const events = parseStreamEvents(response.body);

    assert.equal(events.some((event) => event.type === "progress"), false);
    assert.equal(events.filter((event) => event.type === "delta").map((event) => event.delta ?? "").join(""), "Bonjour!");
    assert.equal(events.at(-1)?.type, "done");
  });
});

async function buildApp(service: Partial<AgentPanelChatService>) {
  const app = Fastify({ logger: false });
  await app.register(agentPanelRoutes, {
    getActiveProfileId: () => "profile_a",
    service: service as AgentPanelChatService,
  });
  return app;
}

function assertEnvelope(response: Awaited<ReturnType<ReturnType<typeof Fastify>["inject"]>>, status: number, messageText: string) {
  const body = response.json() as ApiResponse<unknown>;
  assert.equal(response.statusCode, status);
  assert.equal(body.status_code, status);
  assert.equal(body.message, messageText);
  assert.equal(body.error, null);
}

function parseStreamEvents(body: string): Array<{
  type: string;
  delta?: string;
  status?: string;
  message?: string;
  approvalId?: string;
  executionId?: string;
  toolName?: string;
  result?: { execution?: { status?: string } };
  question?: string;
  options?: Array<unknown>;
  tool?: { toolCallId?: string; pluginId?: string };
  tools?: Array<{ toolCallId?: string; pluginId?: string }>;
}> {
  return body
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("data:"))
    .map((chunk) => JSON.parse(chunk.slice("data:".length).trim()));
}

function session(id: string) {
  return {
    id,
    profileId: "profile_a",
    workflowId: "workflow_agent",
    triggerNodeId: "chat_trigger",
    agentNodeId: "agent",
    agentKey: "profile_a:workflow_agent:chat_trigger:agent",
    title: "Support",
    status: "active",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function message(id: string, sessionId: string) {
  return {
    id,
    profileId: "profile_a",
    sessionId,
    role: "user" as const,
    content: "Hello",
    createdAt: new Date(0).toISOString(),
  };
}
