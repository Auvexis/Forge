import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import agentPanelRoutes from "./agent-panel.routes.ts";
import type { AgentPanelChatService } from "../modules/agent-runtime/chat/agent-panel-chat-service.ts";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";

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
