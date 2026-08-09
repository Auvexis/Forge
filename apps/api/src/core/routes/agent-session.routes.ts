import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { AgentSessionRepository } from "../modules/agent-runtime/session/agent-session-repository.ts";
import { ChatSessionRepository } from "../modules/agent-runtime/chat/chat-session-repository.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";
import { WorkflowRepository } from "../modules/workflows/repository.ts";
import { listTriggerEntries, resolveChatTrigger } from "../modules/workflows/workflow-triggers.ts";
import type { AiAgentNode, WorkflowItem } from "../../shared/models/workflow-types.ts";

export interface AgentSessionRoutesOptions {
  db?: Database.Database;
  getWorkflowDatabase?: () => Database.Database;
  getActiveProfileId?: () => string;
  getActiveWorkflows?: typeof WorkflowRepository.getActiveWorkflows;
}

export default async function agentSessionRoutes(
  fastify: FastifyInstance,
  options: AgentSessionRoutesOptions = {},
) {
  const getProfileId = options.getActiveProfileId ??
    (() => activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default");
  const getDb = () => options.db ?? options.getWorkflowDatabase?.() ?? WorkflowRepository.database();
  const getActiveWorkflows = options.getActiveWorkflows ?? WorkflowRepository.getActiveWorkflows;

  fastify.get("/agent-chats", async (_request, reply) => {
    const profileId = getProfileId();
    const chatSessions = new ChatSessionRepository(getDb());
    const chats = getActiveWorkflows().flatMap((workflow) =>
      listTriggerEntries(workflow).flatMap((entry) => {
        if (entry.disabled || entry.trigger.type !== "chat" || !entry.trigger.chatSlug) return [];
        const agentIdentity = resolveConnectedAgentIdentity(workflow, entry.id);
        return [{
          chatSlug: entry.trigger.chatSlug,
          title: entry.trigger.chatTitle?.trim() || entry.name || workflow.metadata.name,
          agentName: agentIdentity.name,
          agentAvatar: agentIdentity.avatar,
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

  fastify.post("/agent-chats/:chatSlug/sessions", async (request, reply) => {
    const chatSessions = new ChatSessionRepository(getDb());
    const { chatSlug } = request.params as { chatSlug: string };
    const resolved = resolveChatTrigger(getActiveWorkflows(), chatSlug, { requireActive: true });
    if (!resolved) {
      const response: ApiResponse<null> = {
        status_code: 404,
        message: "Published agent chat not found",
        error: "Published agent chat not found",
        data: null,
      };
      return reply.code(404).send(response);
    }
    const requestedTitle = (request.body as { title?: unknown } | undefined)?.title;
    const session = chatSessions.create({
      id: `session_${randomUUID()}`,
      profileId: getProfileId(),
      workflowId: resolved.workflow.metadata.id,
      triggerNodeId: resolved.triggerNodeId,
      title: typeof requestedTitle === "string" && requestedTitle.trim()
        ? requestedTitle.trim().slice(0, 80)
        : resolved.entry.trigger.chatTitle?.trim() || resolved.entry.name || "Agent chat",
      status: "active",
    });
    const response: ApiResponse<typeof session> = {
      status_code: 201,
      message: "Agent chat session created",
      error: null,
      data: session,
    };
    return reply.code(201).send(response);
  });

  fastify.get("/agent-sessions/:sessionId/snapshot", async (request, reply) => {
    reply.header("Cache-Control", "no-store, no-cache, must-revalidate");
    const { sessionId } = request.params as { sessionId: string };
    const profileId = getProfileId();
    const repository = new AgentSessionRepository(getDb());
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
import { randomUUID } from "node:crypto";

function resolveConnectedAgentIdentity(
  workflow: WorkflowItem,
  triggerNodeId: string,
): { name: string; avatar: string } {
  const visited = new Set<string>([triggerNodeId]);
  const queue = [triggerNodeId];

  while (queue.length > 0) {
    const source = queue.shift()!;
    for (const edge of workflow.edges) {
      if (edge.source !== source || visited.has(edge.target)) continue;
      visited.add(edge.target);
      const target = workflow.nodes[edge.target];
      if (target?.type === "ai-agent") {
        return {
          name: agentDisplayName(target),
          avatar: target.agentEmoji?.trim() || "AI",
        };
      }
      queue.push(edge.target);
    }
  }

  return { name: "Agent", avatar: "AI" };
}

function agentDisplayName(agent: AiAgentNode): string {
  return agent.agentDisplayName?.trim() || agent.name?.trim() || "AI Agent";
}
