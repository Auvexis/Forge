import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { DatabaseManager } from "../database/index.ts";
import { AgentSessionRepository } from "../modules/agent-runtime/session/agent-session-repository.ts";
import { ChatSessionRepository } from "../modules/agent-runtime/chat/chat-session-repository.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";
import { WorkflowRepository } from "../modules/workflows/repository.ts";
import { listTriggerEntries } from "../modules/workflows/workflow-triggers.ts";

export interface AgentSessionRoutesOptions {
  db?: Database.Database;
  getActiveProfileId?: () => string;
  getActiveWorkflows?: typeof WorkflowRepository.getActiveWorkflows;
}

export default async function agentSessionRoutes(
  fastify: FastifyInstance,
  options: AgentSessionRoutesOptions = {},
) {
  const getProfileId = options.getActiveProfileId ??
    (() => activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default");
  const repository = new AgentSessionRepository(options.db ?? DatabaseManager.workflows);
  const chatSessions = new ChatSessionRepository(options.db ?? DatabaseManager.workflows);
  const getActiveWorkflows = options.getActiveWorkflows ?? WorkflowRepository.getActiveWorkflows;

  fastify.get("/agent-chats", async (_request, reply) => {
    const profileId = getProfileId();
    const chats = getActiveWorkflows().flatMap((workflow) =>
      listTriggerEntries(workflow).flatMap((entry) => {
        if (entry.disabled || entry.trigger.type !== "chat" || !entry.trigger.chatSlug) return [];
        return [{
          chatSlug: entry.trigger.chatSlug,
          title: entry.trigger.chatTitle?.trim() || entry.name || workflow.metadata.name,
          workflowId: workflow.metadata.id,
          workflowName: workflow.metadata.name,
          triggerNodeId: entry.id,
          sessions: chatSessions.listByWorkflow(profileId, workflow.metadata.id)
            .filter((session) => session.triggerNodeId === entry.id),
        }];
      })
    );
    const response: ApiResponse<typeof chats> = {
      status_code: 200,
      message: "Published agent chats fetched",
      error: null,
      data: chats,
    };
    return reply.code(200).send(response);
  });

  fastify.get("/agent-sessions/:sessionId/snapshot", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const profileId = getProfileId();
    const session = repository.getSession(profileId, sessionId);
    if (!session) {
      const response: ApiResponse<null> = {
        status_code: 404,
        message: "Agent session not found",
        error: "Agent session not found",
        data: null,
      };
      return reply.code(404).send(response);
    }

    const snapshot = repository.getSnapshot({ profileId, sessionId });
    const response: ApiResponse<typeof snapshot> = {
      status_code: 200,
      message: "Agent session snapshot fetched",
      error: null,
      data: snapshot,
    };
    return reply.code(200).send(response);
  });
}
