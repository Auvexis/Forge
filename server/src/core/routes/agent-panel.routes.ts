import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";
import { AgentRuntimeError, serializeAgentError } from "../modules/agent-runtime/agent-errors.ts";
import { workflowEventBus, type WorkflowEvent } from "../modules/workflows/event-bus.ts";
import { CancellationRegistry } from "../modules/workflows/cancellation-registry.ts";
import {
  AgentPanelChatService,
  type DeleteAgentPanelSessionInput,
} from "../modules/agent-runtime/chat/agent-panel-chat-service.ts";

export interface AgentPanelRoutesOptions {
  getActiveProfileId?: () => string;
  service?: Pick<
    AgentPanelChatService,
    | "listAgents"
    | "listSessions"
    | "createSession"
    | "listMessages"
    | "sendFirstMessage"
    | "sendMessage"
    | "appendStreamAssistantMessage"
    | "deleteSession"
  >;
}

type AgentPanelScope = "current" | "global";
type MemoryMode = DeleteAgentPanelSessionInput["memoryMode"];
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:23802";
const pendingAgentPanelStreams = new Map<string, PendingAgentPanelStream>();

interface PendingAgentPanelStream {
  profileId: string;
  sessionId: string;
  message: string;
  executionMode?: "loop" | "plan";
  createdAt: number;
}

export default async function agentPanelRoutes(
  fastify: FastifyInstance,
  options: AgentPanelRoutesOptions = {},
) {
  const getProfileId =
    options.getActiveProfileId ??
    (() => activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default");
  const getService = () => options.service ?? new AgentPanelChatService();

  fastify.get("/agent-panel/agents", async (req, reply) => {
    try {
      const query = req.query as { scope?: AgentPanelScope };
      const scope = query.scope === "global" ? "global" : "current";
      return sendResponse(reply, {
        status_code: 200,
        message: "Agent panel agents fetched",
        error: null,
        data: await getService().listAgents({ profileId: getProfileId(), scope }),
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.get("/agent-panel/agents/:agentKey/sessions", async (req, reply) => {
    try {
      const { agentKey } = req.params as { agentKey: string };
      return sendResponse(reply, {
        status_code: 200,
        message: "Agent panel sessions fetched",
        error: null,
        data: await getService().listSessions({ profileId: getProfileId(), agentKey }),
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.post("/agent-panel/agents/:agentKey/sessions", async (req, reply) => {
    try {
      const { agentKey } = req.params as { agentKey: string };
      const body = req.body as { title?: unknown } | undefined;
      return sendResponse(reply, {
        status_code: 201,
        message: "Agent panel session created",
        error: null,
        data: await getService().createSession({
          profileId: getProfileId(),
          agentKey,
          title: stringOrUndefined(body?.title),
        }),
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.post("/agent-panel/agents/:agentKey/messages", async (req, reply) => {
    try {
      const { agentKey } = req.params as { agentKey: string };
      const body = req.body as { message?: unknown; executionMode?: unknown } | undefined;
      const message = String(body?.message ?? "").trim();
      if (!message) {
        throw new AgentRuntimeError(
          "Invalid agent panel message",
          "AGENT_PANEL_INPUT_INVALID",
          "Invalid agent panel message",
          400,
        );
      }

      return sendResponse(reply, {
        status_code: 200,
        message: "Agent panel message sent",
        error: null,
        data: await getService().sendFirstMessage({
          profileId: getProfileId(),
          agentKey,
          message,
          executionMode: normalizeExecutionMode(body?.executionMode),
        }),
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.get("/agent-panel/sessions/:sessionId/messages", async (req, reply) => {
    try {
      const { sessionId } = req.params as { sessionId: string };
      return sendResponse(reply, {
        status_code: 200,
        message: "Agent panel messages fetched",
        error: null,
        data: await getService().listMessages({ profileId: getProfileId(), sessionId }),
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.post("/agent-panel/sessions/:sessionId/messages", async (req, reply) => {
    try {
      const { sessionId } = req.params as { sessionId: string };
      const body = req.body as { message?: unknown; executionMode?: unknown } | undefined;
      const message = String(body?.message ?? "").trim();
      if (!message) {
        throw new AgentRuntimeError(
          "Invalid agent panel message",
          "AGENT_PANEL_INPUT_INVALID",
          "Invalid agent panel message",
          400,
        );
      }

      return sendResponse(reply, {
        status_code: 200,
        message: "Agent panel message sent",
        error: null,
        data: await getService().sendMessage({
          profileId: getProfileId(),
          sessionId,
          message,
          executionMode: normalizeExecutionMode(body?.executionMode),
        }),
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.post("/agent-panel/sessions/:sessionId/messages/stream/start", async (req, reply) => {
    try {
      const { sessionId } = req.params as { sessionId: string };
      const body = req.body as { message?: unknown; executionMode?: unknown } | undefined;
      const message = String(body?.message ?? "").trim();
      if (!message) {
        throw new AgentRuntimeError(
          "Invalid agent panel message",
          "AGENT_PANEL_INPUT_INVALID",
          "Invalid agent panel message",
          400,
        );
      }

      const streamId = `agent_panel_stream_${Date.now()}_${randomUUID().slice(0, 8)}`;
      pendingAgentPanelStreams.set(streamId, {
        profileId: getProfileId(),
        sessionId,
        message,
        executionMode: normalizeExecutionMode(body?.executionMode),
        createdAt: Date.now(),
      });
      prunePendingAgentPanelStreams();

      return sendResponse(reply, {
        status_code: 202,
        message: "Agent panel stream started",
        error: null,
        data: { streamId },
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.get("/agent-panel/sessions/:sessionId/messages/streams/:streamId", async (req, reply) => {
    const { sessionId, streamId } = req.params as { sessionId: string; streamId: string };
    const pending = pendingAgentPanelStreams.get(streamId);
    pendingAgentPanelStreams.delete(streamId);
    if (!pending || pending.sessionId !== sessionId) {
      return sendAgentError(
        reply,
        new AgentRuntimeError(
          "Agent panel stream not found",
          "AGENT_PANEL_STREAM_NOT_FOUND",
          "Agent panel stream not found",
          404,
        ),
      );
    }

    return streamAgentPanelMessage(req, reply, {
      profileId: pending.profileId,
      sessionId,
      message: pending.message,
      executionMode: pending.executionMode,
      service: getService(),
    });
  });

  fastify.post("/agent-panel/sessions/:sessionId/messages/stream", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const body = req.body as { message?: unknown; executionMode?: unknown } | undefined;
    const message = String(body?.message ?? "").trim();
    if (!message) {
      return sendAgentError(
        reply,
        new AgentRuntimeError(
          "Invalid agent panel message",
          "AGENT_PANEL_INPUT_INVALID",
          "Invalid agent panel message",
          400,
        ),
      );
    }

    return streamAgentPanelMessage(req, reply, {
      profileId: getProfileId(),
      sessionId,
      message,
      executionMode: normalizeExecutionMode(body?.executionMode),
      service: getService(),
    });
  });

  fastify.delete("/agent-panel/sessions/:sessionId", async (req, reply) => {
    try {
      const { sessionId } = req.params as { sessionId: string };
      const query = req.query as { memoryMode?: MemoryMode };
      await getService().deleteSession({
        profileId: getProfileId(),
        sessionId,
        memoryMode: normalizeMemoryMode(query.memoryMode),
      });
      return sendResponse(reply, {
        status_code: 200,
        message: "Agent panel session deleted",
        error: null,
        data: null,
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });
}

function sendResponse<T>(reply: FastifyReply, response: ApiResponse<T>) {
  return reply.code(response.status_code).send(response);
}

function sendAgentError(reply: FastifyReply, error: unknown) {
  const serialized = error instanceof AgentRuntimeError
    ? serializeAgentError(error)
    : { code: "AGENT_RUNTIME_ERROR", message: safeErrorMessage(error) };
  const statusCode = error instanceof AgentRuntimeError ? error.statusCode : 500;
  return sendResponse(reply, {
    status_code: statusCode,
    message: serialized.message,
    error: serialized.message,
    data: null,
  });
}

async function streamAgentPanelMessage(
  req: { raw: { on: (event: "close", listener: () => void) => unknown } },
  reply: FastifyReply,
  input: {
    profileId: string;
    sessionId: string;
    message: string;
    executionMode?: "loop" | "plan";
    service: Pick<AgentPanelChatService, "sendMessage"> & Partial<Pick<AgentPanelChatService, "appendStreamAssistantMessage">>;
  },
) {
  const executionId = `exec_agent_panel_${Date.now()}_${randomUUID().slice(0, 8)}`;
  reply.hijack();
  writeStreamHeaders(reply);
  reply.raw.write(": connected\n\n");
  flushStreamEvent(reply);
  writeStreamEvent(reply, { type: "start", executionId });

  let nativeDeltaCount = 0;
  let sawToolActivity = false;
  let sentToolIntro = false;
  let progressEventCount = 0;
  let progressQueue = Promise.resolve();
  let persistenceQueue = Promise.resolve();
  const completedToolCalls: ToolProgress[] = [];
  const persistStreamAssistantMessage = (content: unknown) => {
    if (!input.service.appendStreamAssistantMessage) return;
    persistenceQueue = persistenceQueue
      .then(() => input.service.appendStreamAssistantMessage?.({
        profileId: input.profileId,
        sessionId: input.sessionId,
      }, content))
      .then(() => undefined, () => undefined);
  };
  const queueProgressEvent = (event: Record<string, unknown>) => {
    progressQueue = progressQueue.then(async () => {
      progressEventCount += 1;
      writeStreamEvent(reply, event);
      if (event.type === "progress" && isToolProgressEvent(event)) {
        persistStreamAssistantMessage({
          kind: "agentProgress",
          status: event.status,
          message: event.message,
          tool: event.tool,
        });
      }
    });
  };
  const markToolActivity = () => {
    sawToolActivity = true;
    if (sentToolIntro) return;
    sentToolIntro = true;
    progressQueue = progressQueue.then(() =>
      writeIntroDeltas(reply, splitTextForDeltas(formatToolIntroMessage(), 28)),
    );
  };
  const unsubscribe = workflowEventBus.onExecution(executionId, (event) => {
    if (event.type === "agent:thinking") {
      const message = extractAgentStatusMessage(event);
      if (message) {
        queueProgressEvent({
          type: "progress",
          status: "running",
          message,
        });
      }
    }
    if (event.type === "agent:plan-end") {
      queueProgressEvent({
        type: "progress",
        status: "planned",
        message: "Generating parameters",
      });
      queueProgressEvent({
        type: "progress",
        status: "running",
        message: "Executing",
      });
    }
    if (event.type === "agent:repair-start") {
      const message = extractAgentStatusMessage(event);
      if (message) {
        queueProgressEvent({
          type: "progress",
          status: "retrying",
          message,
        });
      }
    }
    if (event.type === "agent:tool-intent") {
      markToolActivity();
      queueProgressEvent({
        type: "progress",
        status: "planned",
        message: formatToolProgressMessage(event, "planned"),
        tool: extractToolProgress(event),
      });
    }
    if (event.type === "agent:tool-start") {
      markToolActivity();
      queueProgressEvent({
        type: "progress",
        status: "running",
        message: formatToolProgressMessage(event, "running"),
        tool: extractToolProgress(event),
      });
    }
    if (event.type === "agent:tool-retry") {
      markToolActivity();
      queueProgressEvent({
        type: "progress",
        status: "retrying",
        message: formatToolProgressMessage(event, "retrying"),
        tool: extractToolProgress(event),
      });
    }
    if (event.type === "agent:tool-end") {
      markToolActivity();
      const status = extractToolStatus(event) === "failed" ? "failed" : "success";
      const tool = extractToolProgress(event);
      queueProgressEvent({
        type: "progress",
        status,
        message: formatToolProgressMessage(event, status),
        tool,
      });
      if (status === "success") completedToolCalls.push(tool);
    }
    if (event.type === "agent:approval-created") {
      markToolActivity();
      writeStreamEvent(reply, {
        type: "approval",
        ...extractApprovalProgress(event),
      });
      persistStreamAssistantMessage({
        kind: "agentApproval",
        ...extractApprovalProgress(event),
      });
    }
    if (event.type === "agent:output-delta") {
      const delta = extractAgentDelta(event);
      if (delta) {
        nativeDeltaCount += 1;
        writeStreamEvent(reply, { type: "delta", delta });
        persistStreamAssistantMessage({ text: delta });
      }
    }
    if (event.type === "agent:error") {
      const message = extractAgentError(event) ?? event.error ?? "Agent execution failed";
      writeStreamEvent(reply, {
        type: "error",
        message,
      });
      persistStreamAssistantMessage({
        kind: "agentError",
        message,
      });
    }
  });
  const heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 15000);
  let streamFinished = false;

  req.raw.on("close", () => {
    if (!streamFinished) CancellationRegistry.cancel(executionId);
    unsubscribe();
    clearInterval(heartbeat);
  });

  try {
    const result = await input.service.sendMessage({
      profileId: input.profileId,
      sessionId: input.sessionId,
      message: input.message,
      executionMode: input.executionMode,
      executionId,
      skipPersistedToolMessages: Boolean(input.service.appendStreamAssistantMessage),
    });
    if (isWaitingApprovalResult(result)) {
      await progressQueue;
      await persistenceQueue;
      writeStreamEvent(reply, { type: "waiting-approval", result });
      return;
    }
    const choice = extractChoiceFromResult(result);
    if (choice) {
      writeStreamEvent(reply, { type: "choice", ...choice });
      persistStreamAssistantMessage({ kind: "agentChoice", ...choice });
    }
    if (completedToolCalls.length === 0) {
      const fallbackToolCalls = extractCompletedToolCallsFromResult(result);
      for (const tool of fallbackToolCalls) {
        markToolActivity();
        writeToolProgressLifecycle(queueProgressEvent, tool);
        if (tool.status === "success") completedToolCalls.push(tool);
      }
    }
    await progressQueue;
    if (nativeDeltaCount === 0 && completedToolCalls.length === 0) {
      await writeFallbackDeltas(reply, splitAssistantMessageForStream(result));
    }
    if (completedToolCalls.length > 0) {
      const summaryEvent = {
        type: "summary",
        message: formatToolSummaryMessage(completedToolCalls),
        tools: completedToolCalls,
      };
      writeStreamEvent(reply, summaryEvent);
      persistStreamAssistantMessage({
        kind: "agentSummary",
        message: summaryEvent.message,
        tools: summaryEvent.tools,
      });
    }
    await persistenceQueue;
    writeStreamEvent(reply, { type: "done", result });
  } catch (error) {
    const serialized = error instanceof AgentRuntimeError
      ? serializeAgentError(error)
      : { code: "AGENT_RUNTIME_ERROR", message: safeErrorMessage(error) };
    await progressQueue;
    writeStreamEvent(reply, { type: "error", ...serialized });
    persistStreamAssistantMessage({ kind: "agentError", message: serialized.message, code: serialized.code });
    await persistenceQueue;
  } finally {
    streamFinished = true;
    unsubscribe();
    clearInterval(heartbeat);
    setTimeout(() => reply.raw.end(), 100);
  }

  return new Promise((resolve) => {
    req.raw.on("close", () => resolve(undefined));
  });
}

function isToolProgressEvent(event: Record<string, unknown>): boolean {
  return Boolean(event.tool && typeof event.tool === "object" && !Array.isArray(event.tool));
}

function prunePendingAgentPanelStreams(): void {
  const expiresBefore = Date.now() - 60000;
  for (const [streamId, pending] of pendingAgentPanelStreams) {
    if (pending.createdAt < expiresBefore) pendingAgentPanelStreams.delete(streamId);
  }
}

function writeStreamHeaders(reply: FastifyReply): void {
  reply.raw.socket?.setNoDelay?.(true);
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": CLIENT_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "X-Accel-Buffering": "no",
  });
  if (reply.raw.socket) {
    reply.raw.flushHeaders();
  }
}

function writeStreamEvent(reply: FastifyReply, event: Record<string, unknown>): void {
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  flushStreamEvent(reply);
}

function flushStreamEvent(reply: FastifyReply): void {
  if (!reply.raw.socket) return;
  (reply.raw as FastifyReply["raw"] & { flush?: () => void }).flush?.();
}

function extractAgentDelta(event: WorkflowEvent): string {
  const data = event.data as { delta?: unknown } | undefined;
  return typeof data?.delta === "string" ? data.delta : "";
}

function extractAgentError(event: WorkflowEvent): string | null {
  const data = event.data as { message?: unknown; error?: unknown } | undefined;
  if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
  return null;
}

function extractAgentStatusMessage(event: WorkflowEvent): string {
  const data = event.data as { message?: unknown } | undefined;
  return typeof data?.message === "string" ? data.message.trim() : "";
}

type ToolProgressStatus = "planned" | "running" | "retrying" | "success" | "failed";

interface ToolProgress {
  toolCallId: string;
  name: string;
  pluginId?: string;
  pluginName?: string;
  reason?: string;
  status?: "success" | "failed";
  details?: {
    params?: unknown;
    output?: unknown;
  };
}

function extractToolProgress(event: WorkflowEvent): ToolProgress {
  const data = event.data as Record<string, unknown> | undefined;
  const nestedTool = data?.tool && typeof data.tool === "object" && !Array.isArray(data.tool)
    ? data.tool as Record<string, unknown>
    : {};
  const callId = typeof data?.callId === "string" ? data.callId : undefined;
  const nestedCallId = typeof nestedTool.toolCallId === "string" ? nestedTool.toolCallId : undefined;
  const toolCallId = typeof data?.toolCallId === "string"
    ? data.toolCallId
    : nestedCallId ?? callId ?? `${event.nodeId}:${event.timestamp}:${typeof data?.name === "string" ? data.name : "agent-tool"}`;
  const name = firstString(data?.name, nestedTool.name) ?? "agent tool";
  const pluginId = firstString(data?.pluginId, nestedTool.pluginId);
  const pluginName = firstString(data?.pluginName, nestedTool.pluginName);
  const reason = firstString(data?.reason, nestedTool.reason);
  const details = data?.details && typeof data.details === "object" && !Array.isArray(data.details)
    ? data.details as ToolProgress["details"]
    : undefined;
  return { toolCallId, name, pluginId, pluginName, reason, ...(details ? { details } : {}) };
}

function firstString(...values: unknown[]): string | undefined {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" ? value.trim() : undefined;
}

function extractToolStatus(event: WorkflowEvent): string {
  const data = event.data as Record<string, unknown> | undefined;
  return typeof data?.status === "string" ? data.status : "";
}

function extractApprovalProgress(event: WorkflowEvent): Record<string, unknown> {
  const data = event.data as Record<string, unknown> | undefined;
  const toolName = typeof data?.toolName === "string" ? data.toolName : "agent tool";
  const approvalId = typeof data?.approvalId === "string" ? data.approvalId : "";
  const executionId = typeof data?.executionId === "string" ? data.executionId : event.executionId;
  const sideEffect = typeof data?.sideEffect === "string" ? data.sideEffect : undefined;
  return {
    approvalId,
    executionId,
    toolName,
    ...(sideEffect ? { sideEffect } : {}),
    message: `Approval required for ${toolName}.`,
  };
}

function formatToolProgressMessage(
  event: WorkflowEvent,
  status: ToolProgressStatus,
): string {
  const error = extractToolError(event);
  if (status === "failed" && error) return `${extractToolProgress(event).name} failed: ${error}`;
  return formatToolProgressMessageFromTool(extractToolProgress(event), status);
}

function extractToolError(event: WorkflowEvent): string | undefined {
  const data = event.data as Record<string, unknown> | undefined;
  return typeof data?.error === "string" && data.error.trim() ? data.error.trim() : undefined;
}

function formatToolProgressMessageFromTool(
  tool: ToolProgress,
  status: ToolProgressStatus,
): string {
  const label = tool.name;
  if (status === "planned") return `Preparing to use ${label}.`;
  if (status === "running") return `Using ${label}.`;
  if (status === "retrying") return `Retrying ${label}.`;
  if (status === "success") return `${label} completed.`;
  return `${label} failed.`;
}

function writeToolProgressLifecycle(
  writeProgressEvent: (event: Record<string, unknown>) => void,
  tool: ToolProgress,
): void {
  const statuses: ToolProgressStatus[] = tool.status === "failed"
    ? ["planned", "running", "failed"]
    : ["planned", "running", "success"];
  for (const status of statuses) {
    writeProgressEvent({
      type: "progress",
      status,
      message: formatToolProgressMessageFromTool(tool, status),
      tool,
    });
  }
}

function formatToolIntroMessage(): string {
  return "Preparing to use the required tools.";
}

function formatToolSummaryMessage(tools: ToolProgress[]): string {
  const names = tools.map((tool) => tool.name).join(", ");
  return `Tools used: ${names}.`;
}

function extractCompletedToolCallsFromResult(result: unknown): ToolProgress[] {
  if (!result || typeof result !== "object") return [];
  const execution = (result as { execution?: unknown }).execution;
  if (!execution || typeof execution !== "object") return [];
  const context = (execution as { context?: unknown }).context;
  if (!context || typeof context !== "object") return [];
  const steps = (context as { steps?: unknown }).steps;
  if (!steps || typeof steps !== "object" || Array.isArray(steps)) return [];

  for (const step of Object.values(steps as Record<string, unknown>)) {
    if (!step || typeof step !== "object") continue;
    const output = (step as { output?: unknown }).output;
    if (!output || typeof output !== "object") continue;
    const toolCalls = (output as { toolCalls?: unknown }).toolCalls;
    if (!Array.isArray(toolCalls)) continue;
    return toolCalls.map(normalizeResultToolProgress).filter((tool): tool is ToolProgress => Boolean(tool));
  }

  return [];
}

function normalizeResultToolProgress(value: unknown): ToolProgress | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const toolCallId = typeof record.toolCallId === "string"
    ? record.toolCallId
    : typeof record.callId === "string"
      ? record.callId
      : "";
  const name = typeof record.name === "string" ? record.name : "";
  if (!toolCallId || !name) return null;

  const status = record.status === "failed" ? "failed" : "success";
  return {
    toolCallId,
    name,
    ...(typeof record.pluginId === "string" ? { pluginId: record.pluginId } : {}),
    ...(typeof record.pluginName === "string" ? { pluginName: record.pluginName } : {}),
    ...(typeof record.reason === "string" ? { reason: record.reason } : { reason: "processar esta etapa" }),
    status,
  };
}

function splitAssistantMessageForStream(result: unknown): string[] {
  const text = latestAssistantMessageText(result);
  if (!text) return [];

  const chunks = text.match(/.{1,18}(?:\s+|$)|\S+/g) ?? [text];
  return chunks.map((chunk) => chunk).filter(Boolean);
}

async function writeFallbackDeltas(reply: FastifyReply, deltas: string[]): Promise<void> {
  for (const delta of deltas) {
    writeStreamEvent(reply, { type: "delta", delta });
    await delay(15);
  }
}

async function writeIntroDeltas(reply: FastifyReply, deltas: string[]): Promise<void> {
  for (const delta of deltas) {
    writeStreamEvent(reply, { type: "delta", delta });
    await delay(20);
  }
}

function splitTextForDeltas(text: string, maxLength: number): string[] {
  const chunks = text.match(new RegExp(`.{1,${maxLength}}(?:\\s+|$)|\\S+`, "g")) ?? [text];
  return chunks.map((chunk) => chunk).filter(Boolean);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function latestAssistantMessageText(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const messages = (result as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return "";

  const assistant = [...messages].reverse().find((message) => {
    return Boolean(message && typeof message === "object" && (message as { role?: unknown }).role === "assistant");
  });
  if (!assistant || typeof assistant !== "object") return "";
  return normalizeMessageContent((assistant as { content?: unknown }).content);
}

function extractChoiceFromResult(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== "object") return null;
  const messages = (result as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return null;
  const assistant = [...messages].reverse().find((message) => {
    return Boolean(message && typeof message === "object" && (message as { role?: unknown }).role === "assistant");
  });
  if (!assistant || typeof assistant !== "object") return null;
  const content = (assistant as { content?: unknown }).content;
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  const record = content as Record<string, unknown>;
  if (record.waitingUser !== true && record.kind !== "agentChoice") return null;
  const question = typeof record.text === "string"
    ? record.text
    : typeof record.question === "string"
      ? record.question
      : "";
  if (!question.trim()) return null;
  return {
    question,
    ...(typeof record.reason === "string" ? { reason: record.reason } : {}),
    ...(Array.isArray(record.options) ? { options: record.options } : {}),
  };
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object" || Array.isArray(content)) return "";
  const record = content as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.content === "string") return record.content;
  if (typeof record.message === "string") return record.message;
  return "";
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim() || "Agent execution failed";
}

function normalizeMemoryMode(value: unknown): MemoryMode {
  if (value === "transcript-only" || value === "all-agent-memory") return value;
  return "session";
}

function normalizeExecutionMode(value: unknown): "loop" | "plan" | undefined {
  if (value === "loop" || value === "plan") return value;
  return undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isWaitingApprovalResult(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const execution = (result as { execution?: unknown }).execution;
  return Boolean(
    execution &&
      typeof execution === "object" &&
      (execution as { status?: unknown }).status === "WAITING_APPROVAL",
  );
}
