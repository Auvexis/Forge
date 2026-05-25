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
    this.assertPublicRateLimit(input, resolved);
    const session = this.resolveSession(input, resolved, message);
    const userMessage = this.messages.append({
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
      metadata: input.metadata ?? {},
    };
    const execution = await this.workflowEngine.executeWorkflowFromTrigger(
      resolved.workflow,
      resolved.triggerNodeId,
      payload,
    );

    return {
      session,
      messages: [...this.messages.listBySession(input.profileId, session.id), userMessage]
        .filter((messageRecord, index, records) =>
          records.findIndex((record) => record.id === messageRecord.id) === index,
        ),
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
}

function createSessionTitle(message: string, workflow: WorkflowItem): string {
  const title = message.slice(0, 80).trim();
  return title || workflow.metadata.name;
}
