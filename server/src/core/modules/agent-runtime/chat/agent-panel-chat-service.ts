import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { AgentRuntimeError } from "../agent-errors.ts";
import {
  buildPublishedAgentKey,
  listPublishedAgentsForProfile,
  type PublishedAgentSummary,
} from "../directory/published-agent-directory.ts";
import type { AgentChatMessage } from "./chat-message-repository.ts";
import { ChatMessageRepository } from "./chat-message-repository.ts";
import type { AgentChatSession } from "./chat-session-repository.ts";
import { ChatSessionRepository } from "./chat-session-repository.ts";
import { WorkflowEngine } from "../../workflows/executor.ts";
import { WorkflowRepository } from "../../workflows/repository.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";

export interface CreateAgentPanelSessionInput {
  profileId: string;
  agentKey: string;
  title?: string;
}

export interface SendAgentPanelMessageInput {
  profileId: string;
  sessionId: string;
  message: string;
}

export interface SendFirstAgentPanelMessageInput {
  profileId: string;
  agentKey: string;
  message: string;
}

export interface DeleteAgentPanelSessionInput {
  profileId: string;
  sessionId: string;
  memoryMode: "session" | "transcript-only" | "all-agent-memory";
}

export interface AgentPanelChatServiceOptions {
  db?: Database.Database;
  workflowRepository?: AgentPanelWorkflowRepository;
  workflowEngine?: Pick<typeof WorkflowEngine, "executeWorkflowFromTrigger">;
}

type AgentPanelWorkflowRepository = Pick<typeof WorkflowRepository, "getActiveWorkflows" | "getWorkflows"> & {
  database?: () => Database.Database;
};

interface ResolvedPublishedAgent {
  summary: PublishedAgentSummary;
  workflow: WorkflowItem;
}

export class AgentPanelChatService {
  private readonly db: Database.Database;
  private readonly sessions: ChatSessionRepository;
  private readonly messages: ChatMessageRepository;
  private readonly workflowRepository: Pick<typeof WorkflowRepository, "getActiveWorkflows" | "getWorkflows">;
  private readonly workflowEngine: Pick<typeof WorkflowEngine, "executeWorkflowFromTrigger">;

  constructor(options: AgentPanelChatServiceOptions = {}) {
    this.workflowRepository = options.workflowRepository ?? WorkflowRepository;
    this.db = options.db ?? resolveWorkflowDatabase(this.workflowRepository);
    this.sessions = new ChatSessionRepository(this.db);
    this.messages = new ChatMessageRepository(this.db);
    this.workflowEngine = options.workflowEngine ?? WorkflowEngine;
  }

  async listAgents(input: { profileId?: string; scope: "current" | "global" }): Promise<PublishedAgentSummary[]> {
    const profileId = input.profileId ?? "default";
    const workflows = input.scope === "global"
      ? this.workflowRepository.getWorkflows()
      : this.workflowRepository.getActiveWorkflows();
    return listPublishedAgentsForProfile(profileId, workflows);
  }

  async listSessions(input: { profileId: string; agentKey: string }): Promise<AgentChatSession[]> {
    this.assertProfileOwnsAgentKey(input.profileId, input.agentKey);
    return this.sessions.listByAgentKey(input.profileId, input.agentKey);
  }

  async createSession(input: CreateAgentPanelSessionInput): Promise<AgentChatSession> {
    const agent = this.resolveAgent(input.profileId, input.agentKey);
    return this.sessions.create({
      id: `chat_${randomUUID()}`,
      profileId: input.profileId,
      workflowId: agent.summary.workflowId,
      triggerNodeId: agent.summary.triggerNodeId,
      agentNodeId: agent.summary.agentNodeId,
      agentKey: agent.summary.key,
      title: input.title?.trim() || "New chat",
      status: "active",
    });
  }

  async listMessages(input: { profileId: string; sessionId: string }): Promise<AgentChatMessage[]> {
    const session = this.sessions.getById(input.profileId, input.sessionId);
    if (!session) return [];
    return this.messages.listBySession(input.profileId, input.sessionId);
  }

  async sendFirstMessage(
    input: SendFirstAgentPanelMessageInput,
  ): Promise<{ session: AgentChatSession; messages: AgentChatMessage[]; execution: unknown }> {
    const message = input.message.trim();
    if (!input.profileId.trim() || !input.agentKey.trim() || !message) {
      throw new AgentRuntimeError(
        "Invalid agent panel message input",
        "AGENT_PANEL_INPUT_INVALID",
        "Invalid agent panel message",
        400,
      );
    }

    const session = await this.createSession({
      profileId: input.profileId,
      agentKey: input.agentKey,
      title: createSessionTitle(message),
    });
    return this.sendMessage({ profileId: input.profileId, sessionId: session.id, message });
  }

  async sendMessage(
    input: SendAgentPanelMessageInput,
  ): Promise<{ session: AgentChatSession; messages: AgentChatMessage[]; execution: unknown }> {
    const message = input.message.trim();
    if (!input.profileId.trim() || !input.sessionId.trim() || !message) {
      throw new AgentRuntimeError(
        "Invalid agent panel message input",
        "AGENT_PANEL_INPUT_INVALID",
        "Invalid agent panel message",
        400,
      );
    }

    const session = this.resolveSession(input.profileId, input.sessionId);
    if (!session.agentKey || !session.agentNodeId) {
      throw new AgentRuntimeError(
        "Agent panel session is missing agent identity",
        "AGENT_PANEL_SESSION_INVALID",
        "Invalid agent panel session",
        404,
      );
    }

    const agent = this.resolveAgent(input.profileId, session.agentKey);
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
      workflowId: agent.summary.workflowId,
      triggerNodeId: agent.summary.triggerNodeId,
      targetAgentNodeId: agent.summary.agentNodeId,
      sessionId: session.id,
      message,
      messages: toContextMessages(previousMessages),
      metadata: { surface: "agent-panel" },
    };
    const execution = await this.workflowEngine.executeWorkflowFromTrigger(
      agent.workflow,
      agent.summary.triggerNodeId,
      payload,
      undefined,
      { targetNodeId: agent.summary.agentNodeId },
    );
    assertSuccessfulChatExecution(execution);

    const assistantResponse = extractAssistantResponse(execution, agent.summary.agentNodeId);
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
      session: this.resolveSession(input.profileId, session.id),
      messages: this.messages.listBySession(input.profileId, session.id),
      execution,
    };
  }

  async deleteSession(input: DeleteAgentPanelSessionInput): Promise<void> {
    const session = this.resolveSession(input.profileId, input.sessionId);
    if (input.memoryMode === "session") {
      this.deleteMemoryNamespace(input.profileId, `session:${session.id}`);
    }
    if (input.memoryMode === "all-agent-memory") {
      this.deleteAgentScopedMemories(input.profileId, session);
    }
    this.sessions.delete(input.profileId, input.sessionId);
  }

  private resolveSession(profileId: string, sessionId: string): AgentChatSession {
    const session = this.sessions.getById(profileId, sessionId);
    if (!session) {
      throw new AgentRuntimeError(
        "Agent panel session not found",
        "AGENT_PANEL_SESSION_NOT_FOUND",
        "Agent panel session not found",
        404,
      );
    }
    return session;
  }

  private resolveAgent(profileId: string, agentKey: string): ResolvedPublishedAgent {
    this.assertProfileOwnsAgentKey(profileId, agentKey);
    const workflows = this.workflowRepository.getActiveWorkflows();
    const summaries = listPublishedAgentsForProfile(profileId, workflows);
    const summary = summaries.find((agent) => agent.key === agentKey);
    const workflow = summary
      ? workflows.find((candidate) => candidate.metadata.id === summary.workflowId)
      : null;
    if (!summary || !workflow) {
      throw new AgentRuntimeError(
        `Published agent not found for key ${agentKey}`,
        "AGENT_PANEL_AGENT_NOT_FOUND",
        "Published agent not found",
        404,
      );
    }
    return { summary, workflow };
  }

  private assertProfileOwnsAgentKey(profileId: string, agentKey: string): void {
    if (agentKey.split(":")[0] === profileId) return;
    throw new AgentRuntimeError(
      "Agent key does not belong to this profile",
      "AGENT_PANEL_AGENT_FORBIDDEN",
      "Published agent not found",
      404,
    );
  }

  private deleteMemoryNamespace(profileId: string, namespace: string): void {
    this.db
      .prepare(`DELETE FROM agent_memories WHERE profile_id = ? AND namespace = ?`)
      .run(profileId, namespace);
  }

  private deleteAgentScopedMemories(profileId: string, session: AgentChatSession): void {
    if (!session.agentNodeId) return;
    this.db
      .prepare(`
        DELETE FROM agent_memories
        WHERE profile_id = ?
          AND source = ?
          AND memory_key = ?
      `)
      .run(profileId, `workflow:${session.workflowId}`, `agent:${session.agentNodeId}:last-output`);
  }
}

function toContextMessages(messages: AgentChatMessage[]): Array<{ role: "user" | "assistant" | "tool" | "system"; content: string }> {
  return messages
    .map((message) => ({
      role: message.role,
      content: normalizeMessageContent(message.content),
    }))
    .filter((message) => message.content.trim());
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object" || Array.isArray(content)) return "";
  const record = content as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.content === "string") return record.content;
  return "";
}

function extractAssistantResponse(execution: unknown, agentNodeId: string): unknown {
  const steps = (execution as { context?: { steps?: Record<string, any> } })?.context?.steps;
  if (!steps) return null;
  return steps[agentNodeId]?.output?.output ??
    Object.values(steps).find((step) => step?.output?.output !== undefined)?.output?.output ??
    null;
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
    `Agent panel workflow execution ${executionId} failed: ${detail}`,
    "AGENT_PANEL_WORKFLOW_FAILED",
    `Agent panel workflow failed in execution ${executionId}: ${detail}`,
    500,
  );
}

function extractWorkflowFailureDetail(steps: Record<string, any> | undefined): string | null {
  if (!steps) return null;
  for (const [nodeId, step] of Object.entries(steps)) {
    const error = step?.error;
    if (typeof error === "string" && error.trim()) return `${nodeId}: ${error.trim()}`;
    if (error instanceof Error && error.message.trim()) return `${nodeId}: ${error.message.trim()}`;
  }
  return null;
}

function createSessionTitle(message: string): string {
  const title = message.replace(/\s+/g, " ").trim();
  if (!title) return "New chat";
  return title.length > 48 ? `${title.slice(0, 45)}...` : title;
}

export { buildPublishedAgentKey };

function resolveWorkflowDatabase(repository: AgentPanelWorkflowRepository): Database.Database {
  return repository.database?.() ?? WorkflowRepository.database();
}
