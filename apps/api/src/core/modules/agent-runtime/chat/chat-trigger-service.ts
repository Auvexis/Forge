import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { DatabaseManager } from "../../../database/index.ts";
import { AgentRuntimeError } from "../agent-errors.ts";
import type {
  AgentChatMessage,
} from "./chat-message-repository.ts";
import { ChatMessageRepository } from "./chat-message-repository.ts";
import type { AgentChatSession } from "./chat-session-repository.ts";
import { ChatSessionRepository } from "./chat-session-repository.ts";
import { WorkflowEngine } from "../../workflows/executor.ts";
import { WorkflowRepository } from "../../workflows/repository.ts";
import {
  resolveChatTrigger,
  type ResolvedWorkflowTrigger,
} from "../../workflows/workflow-triggers.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";

export interface SendChatMessageInput {
  profileId: string;
  chatSlug: string;
  message: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  remoteAddress?: string;
  origin?: string;
}

export interface SendChatMessageResult {
  session: AgentChatSession;
  messages: AgentChatMessage[];
  execution: unknown;
}

export interface ChatTriggerServiceOptions {
  db?: Database.Database;
  workflowRepository?: Pick<typeof WorkflowRepository, "getActiveWorkflows" | "getWorkflows">;
  workflowEngine?: Pick<typeof WorkflowEngine, "executeWorkflowFromTrigger">;
  now?: () => number;
}

interface RateLimitBucket {
  windowStartedAt: number;
  count: number;
}

export class ChatTriggerService {
  private readonly sessions: ChatSessionRepository;
  private readonly messages: ChatMessageRepository;
  private readonly workflowRepository: Pick<typeof WorkflowRepository, "getActiveWorkflows" | "getWorkflows">;
  private readonly workflowEngine: Pick<typeof WorkflowEngine, "executeWorkflowFromTrigger">;
  private readonly now: () => number;
  private readonly rateLimits = new Map<string, RateLimitBucket>();

  constructor(options: ChatTriggerServiceOptions = {}) {
    const db = options.db ?? DatabaseManager.workflows;
    this.sessions = new ChatSessionRepository(db);
    this.messages = new ChatMessageRepository(db);
    this.workflowRepository = options.workflowRepository ?? WorkflowRepository;
    this.workflowEngine = options.workflowEngine ?? WorkflowEngine;
    this.now = options.now ?? Date.now;
  }

  async sendMessage(input: SendChatMessageInput): Promise<SendChatMessageResult> {
    const message = input.message.trim();
    if (!input.profileId.trim() || !input.chatSlug.trim() || !message) {
      throw new AgentRuntimeError(
        "Invalid chat trigger message input",
        "AGENT_CHAT_INPUT_INVALID",
        "Invalid chat message",
        400,
      );
    }

    const resolved = this.resolve(input.chatSlug);
    this.assertNoRawThreadId(input);
    this.assertPublicOriginAllowed(input, resolved);
    this.assertPublicRateLimit(input, resolved);
    const session = this.resolveSession(input, resolved, message);
    const previousMessages = this.messages.listBySession(input.profileId, session.id);
    this.messages.append({
      id: `msg_${randomUUID()}`,
      profileId: input.profileId,
      sessionId: session.id,
      role: "user",
      content: message,
    });
    this.sessions.touch(input.profileId, session.id);

    const payload = {
      type: "chat",
      profileId: input.profileId,
      workflowId: resolved.workflow.metadata.id,
      triggerNodeId: resolved.triggerNodeId,
      sessionId: session.id,
      userId: input.userId,
      message,
      messages: toContextMessages(previousMessages),
      metadata: input.metadata ?? {},
    };
    const execution = await this.workflowEngine.executeWorkflowFromTrigger(
      resolved.workflow,
      resolved.triggerNodeId,
      payload,
    );
    assertSuccessfulChatExecution(execution);
    for (const canonical of extractCanonicalToolMessages(execution)) {
      this.messages.append({
        id: `msg_${randomUUID()}`,
        profileId: input.profileId,
        sessionId: session.id,
        role: canonical.role,
        content: canonical,
      });
    }
    const assistantResponse = extractAssistantResponse(execution);
    if (assistantResponse !== null && assistantResponse !== undefined) {
      this.messages.append({
        id: `msg_${randomUUID()}`,
        profileId: input.profileId,
        sessionId: session.id,
        role: "assistant",
        content: assistantResponse,
      });
      this.sessions.touch(input.profileId, session.id);
    }

    return {
      session,
      messages: this.messages.listBySession(input.profileId, session.id),
      execution,
    };
  }

  getSession(profileId: string, sessionId: string): AgentChatSession | null {
    return this.sessions.getById(profileId, sessionId);
  }

  listMessages(profileId: string, sessionId: string): AgentChatMessage[] {
    return this.messages.listBySession(profileId, sessionId);
  }

  private resolve(chatSlug: string): ResolvedWorkflowTrigger {
    const resolved = resolveChatTrigger(this.workflowRepository.getActiveWorkflows(), chatSlug, {
      requireActive: true,
    });
    if (!resolved) {
      throw new AgentRuntimeError(
        `No active workflow found for chat slug ${chatSlug}`,
        "AGENT_CHAT_TRIGGER_NOT_FOUND",
        "No active workflow found for this chat",
        404,
      );
    }
    return resolved;
  }

  private resolveSession(
    input: SendChatMessageInput,
    resolved: ResolvedWorkflowTrigger,
    message: string,
  ): AgentChatSession {
    if (input.sessionId) {
      const existing = this.sessions.getById(input.profileId, input.sessionId);
      if (
        !existing ||
        existing.workflowId !== resolved.workflow.metadata.id ||
        existing.triggerNodeId !== resolved.triggerNodeId
      ) {
        throw new AgentRuntimeError(
          "Chat session does not belong to this profile/workflow/trigger",
          "AGENT_CHAT_SESSION_INVALID",
          "Invalid chat session",
          404,
        );
      }
      return existing;
    }

    return this.sessions.create({
      id: `chat_${randomUUID()}`,
      profileId: input.profileId,
      workflowId: resolved.workflow.metadata.id,
      triggerNodeId: resolved.triggerNodeId,
      title: createSessionTitle(message, resolved.workflow),
      status: "active",
    });
  }

  private assertPublicRateLimit(
    input: SendChatMessageInput,
    resolved: ResolvedWorkflowTrigger,
  ): void {
    if (resolved.entry.trigger.chatAuthMode !== "public") return;

    const limit = resolved.entry.trigger.chatRateLimitPerMinute ?? 30;
    const key = [
      input.profileId,
      resolved.workflow.metadata.id,
      resolved.triggerNodeId,
      input.remoteAddress ?? "unknown",
    ].join(":");
    const now = this.now();
    const bucket = this.rateLimits.get(key);

    if (!bucket || now - bucket.windowStartedAt >= 60_000) {
      this.rateLimits.set(key, { windowStartedAt: now, count: 1 });
      return;
    }

    if (bucket.count >= limit) {
      throw new AgentRuntimeError(
        "Public chat trigger rate limit exceeded",
        "AGENT_CHAT_RATE_LIMITED",
        "Chat rate limit exceeded",
        429,
      );
    }

    bucket.count += 1;
  }

  private assertPublicOriginAllowed(
    input: SendChatMessageInput,
    resolved: ResolvedWorkflowTrigger,
  ): void {
    if (resolved.entry.trigger.chatAuthMode !== "public") return;

    const allowedOrigins = resolved.entry.trigger.chatAllowedOrigins ?? [];
    if (allowedOrigins.length === 0) return;
    if (input.origin && allowedOrigins.includes(input.origin)) return;

    throw new AgentRuntimeError(
      "Public chat origin is not allowed",
      "AGENT_CHAT_ORIGIN_FORBIDDEN",
      "Chat origin is not allowed",
      403,
    );
  }

  private assertNoRawThreadId(input: SendChatMessageInput): void {
    if (!input.metadata || !Object.hasOwn(input.metadata, "thread_id")) return;

    throw new AgentRuntimeError(
      "Raw LangGraph thread_id is not accepted from chat requests",
      "AGENT_CHAT_THREAD_ID_FORBIDDEN",
      "Chat requests cannot provide a raw thread id",
      400,
    );
  }
}

function createSessionTitle(message: string, workflow: WorkflowItem): string {
  const title = message.slice(0, 80).trim();
  return title || workflow.metadata.name;
}

function toContextMessages(messages: AgentChatMessage[]): Array<{
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}> {
  return messages
    .flatMap((message) => {
      const embedded = message.content && typeof message.content === "object" &&
          !Array.isArray(message.content)
        ? message.content as Record<string, unknown>
        : {};
      const content = normalizeMessageContent(message.content);
      const toolCalls = normalizeToolCalls(embedded.tool_calls);
      if (!content.trim() && toolCalls.length === 0) return [];
      return [{
        role: message.role,
        content,
        ...(typeof embedded.name === "string" ? { name: embedded.name } : {}),
        ...(typeof embedded.tool_call_id === "string"
          ? { tool_call_id: embedded.tool_call_id }
          : {}),
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      }];
    });
}

function normalizeToolCalls(value: unknown): Array<{
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.name !== "string") return [];
    if (!record.arguments || typeof record.arguments !== "object" || Array.isArray(record.arguments)) {
      return [];
    }
    return [{
      id: record.id,
      name: record.name,
      arguments: record.arguments as Record<string, unknown>,
    }];
  });
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object" || Array.isArray(content)) return "";
  const record = content as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.content === "string") return record.content;
  return "";
}

function extractAssistantResponse(execution: unknown): unknown {
  const steps = (execution as { context?: { steps?: Record<string, any> } })?.context?.steps;
  if (!steps) return null;
  const agentStep = Object.values(steps).find((step) => step?.output?.output !== undefined);
  return agentStep?.output?.output ?? null;
}

function extractCanonicalToolMessages(execution: unknown): Array<{
  role: "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}> {
  const steps = (execution as { context?: { steps?: Record<string, any> } })?.context?.steps;
  if (!steps) return [];
  const agentStep = Object.values(steps).find((step) =>
    Array.isArray(step?.output?.conversationMessages)
  );
  const messages = agentStep?.output?.conversationMessages;
  if (!Array.isArray(messages)) return [];
  return messages.filter((message): message is ReturnType<typeof extractCanonicalToolMessages>[number] =>
    message?.role === "assistant" || message?.role === "tool"
  );
}

function assertSuccessfulChatExecution(execution: unknown): void {
  const record = execution as {
    executionId?: unknown;
    status?: unknown;
    context?: { steps?: Record<string, any> };
  };
  if (record?.status !== "FAILED") return;

  const executionId = typeof record.executionId === "string" ? record.executionId : "unknown";
  const detail = extractWorkflowFailureDetail(record.context?.steps) ?? "Unknown workflow failure";
  throw new AgentRuntimeError(
    `Chat workflow execution ${executionId} failed: ${detail}`,
    "AGENT_CHAT_WORKFLOW_FAILED",
    `Chat workflow failed in execution ${executionId}: ${detail}`,
    500,
  );
}

function extractWorkflowFailureDetail(steps: Record<string, any> | undefined): string | null {
  if (!steps) return null;
  if (typeof steps.error === "string" && steps.error.trim()) return steps.error;

  for (const [nodeId, step] of Object.entries(steps)) {
    if (!step || typeof step !== "object") continue;
    if (typeof step.error === "string" && step.error.trim()) {
      return `${nodeId}: ${step.error}`;
    }
  }

  return null;
}
