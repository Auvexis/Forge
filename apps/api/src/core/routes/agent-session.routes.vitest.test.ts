import Database from "better-sqlite3";
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createMigrationEngine } from "../database/migration-engine.ts";
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
        },
        edges: [],
        trigger: { type: "manual" },
      }],
    });

    const response = await app.inject({ method: "GET", url: "/agent-chats" });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([expect.objectContaining({
      chatSlug: "support",
      title: "Support agent",
      sessions: [expect.objectContaining({ id: "session_visible" })],
    })]);
    await app.close();
  });
});
