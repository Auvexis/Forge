import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import Fastify from "fastify";
import agentPanelRoutes from "./agent-panel.routes.ts";
import type { AgentPanelChatService } from "../modules/agent-runtime/chat/agent-panel-chat-service.ts";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { workflowEventBus } from "../modules/workflows/event-bus.ts";

describe("agent panel routes", () => {
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

  it("streams pending, thinking, and output deltas before done", async () => {
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
        workflowEventBus.emitWorkflowEvent({
          executionId: input.executionId,
          workflowId: "workflow_agent",
          nodeId: "agent",
          type: "agent:thinking-delta",
          timestamp: Date.now(),
          data: { delta: "thinking " },
        });
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
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-panel/sessions/chat_1/messages/stream",
      payload: { message: "Hello" },
    });
    const events = response.body
      .split("\n\n")
      .filter((chunk) => chunk.startsWith("data:"))
      .map((chunk) => JSON.parse(chunk.slice("data:".length).trim()) as { type: string; delta?: string });

    assert.deepEqual(events.map((event) => event.type), ["start", "thinking", "delta", "delta", "done"]);
    assert.deepEqual(events.map((event) => event.delta).filter(Boolean), ["thinking ", "hel", "lo"]);
  });

  it("streams approval requests so the global agent chat can confirm or decline", async () => {
    const app = await buildApp({
      sendMessage: async (input: { executionId?: string }) => {
        assert.ok(input.executionId);
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
    assert.equal(events.at(-1)?.type, "done");
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
    assert.equal(events.filter((event) => event.type === "delta").map((event) => event.delta ?? "").join(""), "I'll run the needed steps.");
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
    assert.ok(durationMs >= 1000, `expected spaced progress events, got ${durationMs}ms`);
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
    assert.match(progressEvents[0]?.message ?? "", /Vou usar search_contacts .*encontrar o destinatario correto/);
    assert.equal(progressEvents[0]?.tool?.pluginId, "contacts");
    assert.match(progressEvents[2]?.message ?? "", /Usei search_contacts com sucesso/);
    assert.match(progressEvents[3]?.message ?? "", /Vou usar send_email .*enviar a mensagem/);
    assert.equal(progressEvents[3]?.tool?.pluginId, "gmail");
    assert.match(progressEvents[5]?.message ?? "", /Usei send_email com sucesso/);
    assert.equal(
      events.filter((event) => event.type === "delta").map((event) => event.delta ?? "").join(""),
      "Vou executar as etapas necessarias.",
    );
    const summary = events.find((event) => event.type === "summary");
    assert.deepEqual(summary?.tools?.map((tool) => tool.toolCallId), ["tool_call_1", "tool_call_2"]);
    assert.equal(events.at(-1)?.type, "done");
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

    assert.equal(deltaEvents.map((event) => event.delta ?? "").join(""), "I'll run the needed steps.");
    assert.match(events.find((event) => event.type === "progress")?.message ?? "", /^Running discord_send_message now\./);
    assert.match(events.find((event) => event.type === "summary")?.message ?? "", /^Used these tools: discord_send_message\./);
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
    assert.equal(progressEvents.filter((event) => /com sucesso/.test(event.message ?? "")).length, 2);
    assert.equal(
      events.filter((event) => event.type === "delta").map((event) => event.delta ?? "").join(""),
      "Vou executar as etapas necessarias.",
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
