import type { FastifyInstance, FastifyReply } from "fastify";
import type Database from "better-sqlite3";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { DatabaseManager } from "../database/index.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";
import { AgentRuntimeError, serializeAgentError } from "../modules/agent-runtime/agent-errors.ts";
import { AgentRuntimeService } from "../modules/agent-runtime/agent-runtime-service.ts";
import { ChatTriggerService, type SendChatMessageInput } from "../modules/agent-runtime/chat/chat-trigger-service.ts";
import { AgentMemoryStore } from "../modules/agent-runtime/memory/agent-memory-store.ts";
import { AgentApprovalService } from "../modules/agent-runtime/agent-approval-service.ts";

export interface AgentChatRoutesOptions {
  db?: Database.Database;
  getActiveProfileId?: () => string;
  chatService?: Pick<ChatTriggerService, "sendMessage" | "getSession" | "listMessages">;
  runtimeService?: Pick<typeof AgentRuntimeService, "listTools">;
}

const CHAT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function agentChatRoutes(
  fastify: FastifyInstance,
  options: AgentChatRoutesOptions = {},
) {
  const db = options.db ?? DatabaseManager.workflows;
  const getProfileId =
    options.getActiveProfileId ??
    (() => activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default");
  const chatService = options.chatService ?? new ChatTriggerService({ db });
  const runtimeService = options.runtimeService ?? AgentRuntimeService;
  const memoryStore = new AgentMemoryStore(db);
  const approvalService = new AgentApprovalService(db);

  fastify.post("/agent-chat/:chatSlug/messages", async (req, reply) => {
    try {
      const { chatSlug } = req.params as { chatSlug: string };
      if (!CHAT_SLUG_PATTERN.test(chatSlug)) {
        throw new AgentRuntimeError(
          "Invalid chat slug",
          "AGENT_CHAT_TRIGGER_NOT_FOUND",
          "No active workflow found for this chat",
          404,
        );
      }

      const body = req.body as Partial<SendChatMessageInput> | undefined;
      assertNoRawThreadId(body);
      const message = String(body?.message ?? "").trim();
      if (!message) {
        throw new AgentRuntimeError(
          "Invalid chat message",
          "AGENT_CHAT_INPUT_INVALID",
          "Invalid chat message",
          400,
        );
      }

      const result = await chatService.sendMessage({
        profileId: getProfileId(),
        chatSlug,
        message,
        sessionId: stringOrUndefined(body?.sessionId),
        userId: stringOrUndefined(body?.userId),
        metadata: objectOrUndefined(body?.metadata),
        remoteAddress: req.ip,
        origin: stringOrUndefined(req.headers.origin),
      });

      return sendResponse(reply, {
        status_code: 200,
        message: "Chat message sent",
        error: null,
        data: {
          ...result,
          assistantResponse: extractAssistantResponse(result.execution),
        },
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.get("/agent-chat/sessions/:sessionId/messages", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const profileId = getProfileId();
    const session = chatService.getSession(profileId, sessionId);
    if (!session) return sendResponse(reply, notFound("Chat session not found"));

    return sendResponse(reply, {
      status_code: 200,
      message: "Chat messages fetched",
      error: null,
      data: chatService.listMessages(profileId, sessionId),
    });
  });

  fastify.get("/agent-tools", async (_req, reply) => {
    const tools = runtimeService.listTools().map(({ name, description, pluginId, methodId, inputSchema, sideEffect, requiresApproval, timeoutMs }) => ({
      name,
      description,
      pluginId,
      methodId,
      inputSchema,
      sideEffect,
      requiresApproval,
      timeoutMs,
    }));
    return sendResponse(reply, {
      status_code: 200,
      message: "Agent tools fetched",
      error: null,
      data: tools,
    });
  });

  fastify.get("/agent-memory", async (_req, reply) => {
    return sendResponse(reply, {
      status_code: 200,
      message: "Agent memory fetched",
      error: null,
      data: listProfileMemory(db, getProfileId()),
    });
  });

  fastify.post("/agent-memory", async (req, reply) => {
    try {
      const body = req.body as { namespace?: string; key?: string; value?: unknown; source?: string };
      const profileId = getProfileId();
      const record = memoryStore.put({
        id: `memory_${crypto.randomUUID()}`,
        profileId,
        namespace: String(body.namespace ?? `profile:${profileId}`),
        key: String(body.key ?? ""),
        value: body.value,
        source: String(body.source ?? "manual"),
      });
      return sendResponse(reply, {
        status_code: 201,
        message: "Agent memory saved",
        error: null,
        data: record,
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.delete("/agent-memory/:memoryId", async (req, reply) => {
    const { memoryId } = req.params as { memoryId: string };
    const deleted = deleteProfileMemoryById(db, getProfileId(), memoryId);
    if (!deleted) return sendResponse(reply, notFound("Agent memory not found"));
    return sendResponse(reply, {
      status_code: 200,
      message: "Agent memory deleted",
      error: null,
      data: null,
    });
  });

  fastify.post("/agent-approvals/:approvalId/approve", async (req, reply) => {
    return resolveApproval(req.params as { approvalId: string }, req.body, "approved", reply);
  });

  fastify.post("/agent-approvals/:approvalId/reject", async (req, reply) => {
    return resolveApproval(req.params as { approvalId: string }, req.body, "rejected", reply);
  });

  function resolveApproval(
    params: { approvalId: string },
    body: unknown,
    status: "approved" | "rejected",
    reply: FastifyReply,
  ) {
    const profileId = getProfileId();
    const executionId = (body as { executionId?: string } | undefined)?.executionId;
    const approval = approvalService.getById(profileId, params.approvalId);
    if (!approval || approval.executionId !== executionId) {
      return sendResponse(reply, notFound("Agent approval not found"));
    }

    const resolved = approvalService.resolve(profileId, params.approvalId, {
      status,
      decision: body,
    });
    return sendResponse(reply, {
      status_code: 200,
      message: `Agent approval ${status}`,
      error: null,
      data: resolved,
    });
  }
}

function assertNoRawThreadId(body: Partial<SendChatMessageInput> | undefined): void {
  const record = body as Record<string, unknown> | undefined;
  const metadata = record?.metadata;
  const hasRawThreadId =
    Boolean(record && Object.hasOwn(record, "thread_id")) ||
    Boolean(metadata && typeof metadata === "object" && Object.hasOwn(metadata, "thread_id"));

  if (!hasRawThreadId) return;

  throw new AgentRuntimeError(
    "Raw LangGraph thread_id is not accepted from chat requests",
    "AGENT_CHAT_THREAD_ID_FORBIDDEN",
    "Chat requests cannot provide a raw thread id",
    400,
  );
}

function sendResponse<T>(reply: FastifyReply, response: ApiResponse<T>) {
  return reply.code(response.status_code).send(response);
}

function sendAgentError(reply: FastifyReply, error: unknown) {
  const serialized = serializeAgentError(error);
  const statusCode = error instanceof AgentRuntimeError ? error.statusCode : 500;
  return sendResponse(reply, {
    status_code: statusCode,
    message: serialized.message,
    error: serialized.message,
    data: null,
  });
}

function notFound(message: string): ApiResponse<null> {
  return { status_code: 404, message, error: message, data: null };
}

function listProfileMemory(db: Database.Database, profileId: string) {
  const rows = db
    .prepare(`
      SELECT id, profile_id, namespace, memory_key, value_json, source, created_at, updated_at
      FROM agent_memories
      WHERE profile_id = ?
      ORDER BY updated_at DESC
    `)
    .all(profileId) as Array<Record<string, any>>;
  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    namespace: row.namespace,
    key: row.memory_key,
    value: JSON.parse(row.value_json),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function deleteProfileMemoryById(
  db: Database.Database,
  profileId: string,
  memoryId: string,
): boolean {
  const result = db
    .prepare(`DELETE FROM agent_memories WHERE profile_id = ? AND id = ?`)
    .run(profileId, memoryId);
  return result.changes > 0;
}

function extractAssistantResponse(execution: unknown): unknown {
  const steps = (execution as { context?: { steps?: Record<string, any> } })?.context?.steps;
  if (!steps) return null;
  const agentStep = Object.values(steps).find((step) => step?.output?.output !== undefined);
  return agentStep?.output?.output ?? null;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function objectOrUndefined(value: unknown): Record<string, any> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : undefined;
}
