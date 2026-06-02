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
  executionId?: string;
}

export interface SendFirstAgentPanelMessageInput {
  profileId: string;
  agentKey: string;
  message: string;
  executionId?: string;
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
    return this.sendMessage({
      profileId: input.profileId,
      sessionId: session.id,
      message,
      executionId: input.executionId,
    });
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
      skipFinalResponseAfterToolUse: false,
      metadata: { surface: "agent-panel" },
    };
    const execution = await this.workflowEngine.executeWorkflowFromTrigger(
      agent.workflow,
      agent.summary.triggerNodeId,
      payload,
      input.executionId,
      { targetNodeId: agent.summary.agentNodeId },
    );

    const assistantResponse = extractAssistantResponse(execution, agent.summary.agentNodeId);
    const toolCalls = extractToolCalls(execution, agent.summary.agentNodeId);
    if (toolCalls.length > 0) {
      appendToolProgressMessages(this.messages, input.profileId, session.id, toolCalls);
      appendToolSummaryMessage(this.messages, input.profileId, session.id, toolCalls);
    }
    appendApprovalMessageIfWaiting(this.messages, input.profileId, session.id, execution);

    if (isFailedExecution(execution)) {
      const detail = extractWorkflowFailureDetail((execution as { context?: { steps?: Record<string, any> } }).context?.steps);
      if (toolCalls.some((tool) => tool.status === "failed")) {
        appendAgentErrorMessage(this.messages, input.profileId, session.id, detail ?? "Agent tool failed");
      } else {
        assertSuccessfulChatExecution(execution);
      }
    }

    if (hasAssistantResponse(assistantResponse)) {
      this.messages.append({
        id: `msg_${randomUUID()}`,
        profileId: input.profileId,
        sessionId: session.id,
        role: "assistant",
        content: normalizeAssistantResponseForMessage(assistantResponse),
      });
      this.sessions.touch(input.profileId, session.id);
    }

    return {
      session: this.resolveSession(input.profileId, session.id),
      messages: this.messages.listBySession(input.profileId, session.id),
      execution: toAgentPanelExecutionSummary(execution),
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

function toContextMessages(messages: AgentChatMessage[]): Array<{ role: "user" | "assistant" | "tool" | "system"; content: unknown }> {
  return messages
    .map((message) => ({
      role: message.role,
      content: normalizeMessageContent(message.content),
    }))
    .filter((message) => hasContextContent(message.content));
}

function normalizeMessageContent(content: unknown): unknown {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object" || Array.isArray(content)) return "";
  const record = content as Record<string, unknown>;
  if (record.waitingUser === true) {
    const text = typeof record.text === "string"
      ? record.text
      : typeof record.content === "string"
        ? record.content
        : "";
    return {
      text,
      waitingUser: true,
      ...(typeof record.reason === "string" ? { reason: record.reason } : {}),
      ...(Array.isArray(record.options) ? { options: sanitizeContextValue(record.options) } : {}),
    };
  }
  if (typeof record.text === "string") return record.text;
  if (typeof record.content === "string") return record.content;
  return "";
}

function hasContextContent(content: unknown): boolean {
  if (typeof content === "string") return content.trim().length > 0;
  return Boolean(content && typeof content === "object" && !Array.isArray(content));
}

function sanitizeContextValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return { type: "Buffer", size: value.byteLength };
  }

  if (typeof value === "string") {
    return value.length > 8000 ? `${value.slice(0, 8000)}[truncated ${value.length - 8000} chars]` : value;
  }

  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeContextValue(item));

  if (typeof (value as any).pipe === "function") {
    return { type: "Readable" };
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sanitizeContextValue(item),
    ]),
  );
}

function hasAssistantResponse(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function normalizeAssistantResponseForMessage(value: unknown): unknown {
  if (!isWaitingUserResponse(value)) return value;
  return {
    text: value.question.trim(),
    waitingUser: true,
    ...(typeof value.reason === "string" ? { reason: value.reason } : {}),
    ...(Array.isArray(value.options) ? { options: value.options } : {}),
  };
}

function isWaitingUserResponse(value: unknown): value is {
  question: string;
  reason?: string;
  options?: unknown[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.status === "waiting-user" &&
    typeof record.question === "string" &&
    record.question.trim().length > 0;
}

function extractAssistantResponse(execution: unknown, agentNodeId: string): unknown {
  const steps = (execution as { context?: { steps?: Record<string, any> } })?.context?.steps;
  if (!steps) return null;
  return steps[agentNodeId]?.output?.output ??
    Object.values(steps).find((step) => step?.output?.output !== undefined)?.output?.output ??
    null;
}

function extractToolCalls(execution: unknown, agentNodeId: string): Array<Record<string, unknown>> {
  const steps = (execution as { context?: { steps?: Record<string, any> } })?.context?.steps;
  if (!steps) return [];
  const direct = steps[agentNodeId]?.output?.toolCalls;
  if (Array.isArray(direct)) return direct.filter(isRecord);
  for (const step of Object.values(steps)) {
    const toolCalls = step?.output?.toolCalls;
    if (Array.isArray(toolCalls)) return toolCalls.filter(isRecord);
  }
  return [];
}

function appendToolProgressMessages(
  repository: ChatMessageRepository,
  profileId: string,
  sessionId: string,
  toolCalls: Array<Record<string, unknown>>,
): void {
  for (const tool of toolCalls) {
    for (const status of progressStatusesForTool(tool)) {
      repository.append({
        id: `msg_${randomUUID()}`,
        profileId,
        sessionId,
        role: "assistant",
        content: {
          kind: "agentProgress",
          status,
          message: formatPersistedToolProgressMessage(tool, status),
          tool: normalizePersistedTool(tool),
        },
      });
    }
  }
}

function appendToolSummaryMessage(
  repository: ChatMessageRepository,
  profileId: string,
  sessionId: string,
  toolCalls: Array<Record<string, unknown>>,
): void {
  repository.append({
    id: `msg_${randomUUID()}`,
    profileId,
    sessionId,
    role: "assistant",
    content: {
      kind: "agentSummary",
      message: `Usei estas ferramentas: ${toolCalls.map(toolName).join(", ")}.`,
      tools: toolCalls.map(normalizePersistedTool),
    },
  });
}

function appendApprovalMessageIfWaiting(
  repository: ChatMessageRepository,
  profileId: string,
  sessionId: string,
  execution: unknown,
): void {
  const record = execution as {
    executionId?: unknown;
    status?: unknown;
    context?: { steps?: Record<string, any> };
  };
  if (record.status !== "WAITING_APPROVAL") return;
  const approvalId = extractPendingApprovalId(record.context?.steps);
  if (!approvalId) return;

  repository.append({
    id: `msg_${randomUUID()}`,
    profileId,
    sessionId,
    role: "assistant",
    content: {
      kind: "agentApproval",
      approvalId,
      executionId: typeof record.executionId === "string" ? record.executionId : "",
      toolName: "agent tool",
      message: "Aprovacao necessaria para continuar.",
    },
  });
}

function appendAgentErrorMessage(
  repository: ChatMessageRepository,
  profileId: string,
  sessionId: string,
  detail: string,
): void {
  repository.append({
    id: `msg_${randomUUID()}`,
    profileId,
    sessionId,
    role: "assistant",
    content: {
      kind: "agentError",
      message: `Nao consegui concluir esta etapa: ${detail}.`,
    },
  });
}

function progressStatusesForTool(tool: Record<string, unknown>): Array<"planned" | "running" | "success" | "failed"> {
  return tool.status === "failed"
    ? ["planned", "running", "failed"]
    : ["planned", "running", "success"];
}

function formatPersistedToolProgressMessage(
  tool: Record<string, unknown>,
  status: "planned" | "running" | "success" | "failed",
): string {
  const name = toolName(tool);
  if (status === "planned") return `Vou usar ${name} para processar esta etapa.`;
  if (status === "running") return `Executando ${name} agora.`;
  if (status === "success") return `Usei ${name} com sucesso.`;
  return `Nao consegui usar ${name}.`;
}

function normalizePersistedTool(tool: Record<string, unknown>): Record<string, unknown> {
  return {
    toolCallId: typeof tool.toolCallId === "string"
      ? tool.toolCallId
      : typeof tool.callId === "string"
        ? tool.callId
        : toolName(tool),
    name: toolName(tool),
    ...(typeof tool.pluginId === "string" ? { pluginId: tool.pluginId } : {}),
    ...(typeof tool.pluginName === "string" ? { pluginName: tool.pluginName } : {}),
  };
}

function toolName(tool: Record<string, unknown>): string {
  return typeof tool.name === "string" && tool.name.trim() ? tool.name.trim() : "agent tool";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toAgentPanelExecutionSummary(execution: unknown): unknown {
  if (!execution || typeof execution !== "object") return execution;
  const record = execution as {
    executionId?: unknown;
    status?: unknown;
    context?: { steps?: Record<string, any> };
  };
  const steps = record.context?.steps;
  return {
    executionId: record.executionId,
    status: record.status,
    ...(steps ? { context: { steps: summarizeExecutionSteps(steps) } } : {}),
  };
}

function summarizeExecutionSteps(steps: Record<string, any>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(steps).map(([nodeId, step]) => [
      nodeId,
      summarizeExecutionStep(step),
    ]),
  );
}

function summarizeExecutionStep(step: unknown): unknown {
  if (!step || typeof step !== "object" || Array.isArray(step)) return step;
  const record = step as Record<string, unknown>;
  const output = record.output as Record<string, unknown> | undefined;
  return {
    ...(typeof record.status === "string" ? { status: record.status } : {}),
    ...(typeof record.error === "string" ? { error: record.error } : {}),
    ...(typeof record.approvalId === "string" ? { approvalId: record.approvalId } : {}),
    ...(output && Array.isArray(output.toolCalls) ? { output: { toolCalls: output.toolCalls } } : {}),
  };
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

function isFailedExecution(execution: unknown): boolean {
  return (execution as { status?: unknown })?.status === "FAILED";
}

function extractPendingApprovalId(steps: Record<string, any> | undefined): string | null {
  if (!steps) return null;
  const direct = steps.pendingApprovalId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  for (const step of Object.values(steps)) {
    const approvalId = step?.approvalId;
    if (typeof approvalId === "string" && approvalId.trim()) return approvalId.trim();
  }
  return null;
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
