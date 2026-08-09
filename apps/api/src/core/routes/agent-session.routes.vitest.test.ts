import Database from "better-sqlite3";
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createMigrationEngine } from "../database/migration-engine.ts";
import { ChatSessionRepository } from "../modules/agent-runtime/chat/chat-session-repository.ts";
import { AgentSessionRepository } from "../modules/agent-runtime/session/agent-session-repository.ts";
import { AgentSessionWriter } from "../modules/agent-runtime/session/agent-session-writer.ts";
import agentSessionRoutes from "./agent-session.routes.ts";

describe("agent session routes", () => {
  let db: Database.Database | undefined;

  afterEach(() => db?.close());

  it("returns the canonical persisted snapshot scoped to the active profile", async () => {
    db = new Database(":memory:");
    await createMigrationEngine(db, "workflows").up();
    const repository = new AgentSessionRepository(db);
    const session = repository.createSession({
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
    });
    const writer = new AgentSessionWriter(repository, "profile_1", session.id, session.revision);
    const turn = writer.createTurn({ state: "running" });
    const message = writer.appendMessage(turn.id, "assistant");
    writer.appendText({ turnId: turn.id, messageId: message.id, text: "Working" });

    const app = Fastify();
    await app.register(agentSessionRoutes, {
      db,
      getActiveProfileId: () => "profile_1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/agent-sessions/session_1/snapshot",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      revision: writer.currentRevision,
      session: { id: "session_1", profileId: "profile_1" },
      activeTurn: { id: turn.id, state: "running" },
      messages: [{
        message: { id: message.id },
        parts: [{ type: "text", text: "Working" }],
      }],
    });
    await app.close();
  });

  it("does not expose a session from another profile", async () => {
    db = new Database(":memory:");
    await createMigrationEngine(db, "workflows").up();
    new AgentSessionRepository(db).createSession({
      id: "session_private",
      profileId: "profile_other",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Private",
    });
    const app = Fastify();
    await app.register(agentSessionRoutes, {
      db,
      getActiveProfileId: () => "profile_1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/agent-sessions/session_private/snapshot",
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("lists active chat triggers with profile-scoped sessions", async () => {
    db = new Database(":memory:");
    await createMigrationEngine(db, "workflows").up();
    const sessions = new AgentSessionRepository(db);
    sessions.createSession({
      id: "session_visible",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "chat_trigger",
      title: "Visible",
    });
    sessions.createSession({
      id: "session_other_profile",
      profileId: "profile_2",
      workflowId: "workflow_1",
      triggerNodeId: "chat_trigger",
      title: "Private",
    });
    const app = Fastify();
    await app.register(agentSessionRoutes, {
      db,
      getActiveProfileId: () => "profile_1",
      getActiveWorkflows: () => [{
        metadata: {
          id: "workflow_1",
          name: "Support workflow",
          description: "",
          isActive: true,
          version: "1",
          createdAt: "",
          updatedAt: "",
        },
        nodes: {
          chat_trigger: {
            id: "chat_trigger",
            type: "trigger",
            name: "Support",
            position: { x: 0, y: 0 },
            trigger: {
              type: "chat",
              chatSlug: "support",
              chatTitle: "Support agent",
            },
          },
          agent_1: {
            id: "agent_1",
            type: "ai-agent",
            name: "Internal name",
            agentDisplayName: "YouTube Agent",
            agentEmoji: "🎬",
            position: { x: 0, y: 0 },
            prompt: "Help",
            executionMode: "loop",
            maxToolCalls: 3,
            maxRetriesPerTool: 1,
            timeoutMs: 30000,
            requireApprovalForSideEffects: [],
            outputMode: "text",
          },
        },
        edges: [{ id: "trigger-agent", source: "chat_trigger", target: "agent_1" }],
        trigger: { type: "manual" },
      }],
    });

    const response = await app.inject({ method: "GET", url: "/agent-chats" });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([expect.objectContaining({
      chatSlug: "support",
      title: "Support agent",
      agentName: "YouTube Agent",
      agentAvatar: "🎬",
      sessions: [expect.objectContaining({ id: "session_visible" })],
    })]);
    await app.close();
  });

  it("creates an empty durable session before the first turn", async () => {
    db = new Database(":memory:");
    await createMigrationEngine(db, "workflows").up();
    const app = Fastify();
    await app.register(agentSessionRoutes, {
      db,
      getActiveProfileId: () => "profile_1",
      getActiveWorkflows: () => [chatWorkflow()],
    });

    const response = await app.inject({
      method: "POST",
      url: "/agent-chats/support/sessions",
      payload: { title: "First request" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data).toMatchObject({
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "chat_trigger",
      title: "First request",
      status: "active",
    });
    expect(new AgentSessionRepository(db).getSnapshot({
      profileId: "profile_1",
      sessionId: response.json().data.id,
    }).messages).toEqual([]);
    await app.close();
  });

  it("renames and deletes durable chat sessions inside the active profile", async () => {
    db = new Database(":memory:");
    await createMigrationEngine(db, "workflows").up();
    const chatSessions = new ChatSessionRepository(db);
    const visible = chatSessions.create({
      id: "session_visible",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "chat_trigger",
      title: "Original title",
      status: "active",
    });
    chatSessions.create({
      id: "session_other",
      profileId: "profile_2",
      workflowId: "workflow_1",
      triggerNodeId: "chat_trigger",
      title: "Other profile",
      status: "active",
    });
    const app = Fastify();
    await app.register(agentSessionRoutes, {
      db,
      getActiveProfileId: () => "profile_1",
      getActiveWorkflows: () => [chatWorkflow()],
    });

    const rename = await app.inject({
      method: "PATCH",
      url: `/agent-chat/sessions/${visible.id}`,
      payload: { title: "Renamed chat" },
    });
    const deleteHidden = await app.inject({
      method: "DELETE",
      url: "/agent-chat/sessions/session_other",
    });
    const deleted = await app.inject({
      method: "DELETE",
      url: `/agent-chat/sessions/${visible.id}`,
    });

    expect(rename.statusCode).toBe(200);
    expect(rename.json().data).toMatchObject({ id: visible.id, title: "Renamed chat" });
    expect(deleteHidden.statusCode).toBe(404);
    expect(deleted.statusCode).toBe(200);
    expect(chatSessions.getById("profile_1", visible.id)).toBeNull();
    expect(chatSessions.getById("profile_2", "session_other")).not.toBeNull();
    await app.close();
  });

  it("resolves session storage from the active profile database per request", async () => {
    const first = new Database(":memory:");
    const second = new Database(":memory:");
    await createMigrationEngine(first, "workflows").up();
    await createMigrationEngine(second, "workflows").up();
    let active = first;
    const app = Fastify();
    await app.register(agentSessionRoutes, {
      getActiveProfileId: () => active === first ? "profile_1" : "profile_2",
      getWorkflowDatabase: () => active,
      getActiveWorkflows: () => [chatWorkflow()],
    });

    const firstResponse = await app.inject({ method: "GET", url: "/agent-chats" });
    active = second;
    const secondResponse = await app.inject({ method: "GET", url: "/agent-chats" });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(firstResponse.json().data[0].sessions).toEqual([]);
    expect(secondResponse.json().data[0].sessions).toEqual([]);
    await app.close();
    first.close();
    second.close();
  });
});

function chatWorkflow() {
  return {
    metadata: {
      id: "workflow_1",
      name: "Support workflow",
      description: "",
      isActive: true,
      version: "1",
      createdAt: "",
      updatedAt: "",
    },
    nodes: {
      chat_trigger: {
        id: "chat_trigger",
        type: "trigger" as const,
        name: "Support",
        position: { x: 0, y: 0 },
        trigger: {
          type: "chat" as const,
          chatSlug: "support",
          chatTitle: "Support agent",
        },
      },
      agent_1: {
        id: "agent_1",
        type: "ai-agent" as const,
        name: "Support Agent",
        agentDisplayName: "Support Captain",
        agentEmoji: "⚓",
        position: { x: 0, y: 0 },
        prompt: "Help",
        executionMode: "loop" as const,
        maxToolCalls: 3,
        maxRetriesPerTool: 1,
        timeoutMs: 30000,
        requireApprovalForSideEffects: [],
        outputMode: "text" as const,
      },
    },
    edges: [{ id: "trigger-agent", source: "chat_trigger", target: "agent_1" }],
    trigger: { type: "manual" as const },
  };
}
