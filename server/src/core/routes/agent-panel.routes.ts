import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";
import { AgentRuntimeError, serializeAgentError } from "../modules/agent-runtime/agent-errors.ts";
import { workflowEventBus, type WorkflowEvent } from "../modules/workflows/event-bus.ts";
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
    | "deleteSession"
  >;
}

type AgentPanelScope = "current" | "global";
type MemoryMode = DeleteAgentPanelSessionInput["memoryMode"];
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:23802";

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
      const body = req.body as { message?: unknown } | undefined;
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
        data: await getService().sendFirstMessage({ profileId: getProfileId(), agentKey, message }),
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
      const body = req.body as { message?: unknown } | undefined;
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
        data: await getService().sendMessage({ profileId: getProfileId(), sessionId, message }),
      });
    } catch (error) {
      return sendAgentError(reply, error);
    }
  });

  fastify.post("/agent-panel/sessions/:sessionId/messages/stream", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const body = req.body as { message?: unknown } | undefined;
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

    reply.hijack();
    writeStreamHeaders(reply);
    reply.raw.write(": connected\n\n");
    writeStreamEvent(reply, { type: "start" });

    const executionId = `exec_agent_panel_${Date.now()}_${randomUUID().slice(0, 8)}`;
    let nativeDeltaCount = 0;
    const completedToolCalls: ToolProgress[] = [];
    const unsubscribe = workflowEventBus.onExecution(executionId, (event) => {
      if (event.type === "agent:thinking-delta") {
        const delta = extractAgentDelta(event);
        if (delta) writeStreamEvent(reply, { type: "thinking", delta });
      }
      if (event.type === "agent:tool-intent") {
        writeStreamEvent(reply, {
          type: "progress",
          status: "planned",
          message: formatToolProgressMessage(event, "planned"),
          tool: extractToolProgress(event),
        });
      }
      if (event.type === "agent:tool-start") {
        writeStreamEvent(reply, {
          type: "progress",
          status: "running",
          message: formatToolProgressMessage(event, "running"),
          tool: extractToolProgress(event),
        });
      }
      if (event.type === "agent:tool-end") {
        const status = extractToolStatus(event) === "failed" ? "failed" : "success";
        const tool = extractToolProgress(event);
        writeStreamEvent(reply, {
          type: "progress",
          status,
          message: formatToolProgressMessage(event, status),
          tool,
        });
        if (status === "success") completedToolCalls.push(tool);
      }
      if (event.type === "agent:output-delta") {
        const delta = extractAgentDelta(event);
        if (delta) {
          nativeDeltaCount += 1;
          writeStreamEvent(reply, { type: "delta", delta });
        }
      }
      if (event.type === "agent:error") {
        writeStreamEvent(reply, {
          type: "error",
          message: extractAgentError(event) ?? event.error ?? "Agent execution failed",
        });
      }
    });
    const heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 15000);

    req.raw.on("close", () => {
      unsubscribe();
      clearInterval(heartbeat);
    });

    try {
      const result = await getService().sendMessage({
        profileId: getProfileId(),
        sessionId,
        message,
        executionId,
      });
      if (completedToolCalls.length === 0) {
        const fallbackToolCalls = extractCompletedToolCallsFromResult(result);
        for (const tool of fallbackToolCalls) {
          writeToolProgressLifecycle(reply, tool);
          if (tool.status === "success") completedToolCalls.push(tool);
        }
      }
      if (nativeDeltaCount === 0) {
        await writeFallbackDeltas(reply, splitAssistantMessageForStream(result));
      }
      if (completedToolCalls.length > 0) {
        writeStreamEvent(reply, {
          type: "summary",
          message: `Usei estas ferramentas: ${completedToolCalls.map((tool) => tool.name).join(", ")}. Resposta final pronta.`,
          tools: completedToolCalls,
        });
      }
      writeStreamEvent(reply, { type: "done", result });
    } catch (error) {
      const serialized = error instanceof AgentRuntimeError
        ? serializeAgentError(error)
        : { code: "AGENT_RUNTIME_ERROR", message: safeErrorMessage(error) };
      writeStreamEvent(reply, { type: "error", ...serialized });
    } finally {
      unsubscribe();
      clearInterval(heartbeat);
      setTimeout(() => reply.raw.end(), 100);
    }

    return new Promise((resolve) => {
      req.raw.on("close", resolve);
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

function writeStreamHeaders(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": CLIENT_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "X-Accel-Buffering": "no",
  });
}

function writeStreamEvent(reply: FastifyReply, event: Record<string, unknown>): void {
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
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

type ToolProgressStatus = "planned" | "running" | "success" | "failed";

interface ToolProgress {
  toolCallId: string;
  name: string;
  pluginId?: string;
  pluginName?: string;
  reason?: string;
  status?: "success" | "failed";
}

function extractToolProgress(event: WorkflowEvent): ToolProgress {
  const data = event.data as Record<string, unknown> | undefined;
  const callId = typeof data?.callId === "string" ? data.callId : undefined;
  const toolCallId = typeof data?.toolCallId === "string"
    ? data.toolCallId
    : callId ?? `${event.nodeId}:${event.timestamp}:${typeof data?.name === "string" ? data.name : "agent-tool"}`;
  const name = typeof data?.name === "string" ? data.name : "agent tool";
  const pluginId = typeof data?.pluginId === "string" ? data.pluginId : undefined;
  const pluginName = typeof data?.pluginName === "string" ? data.pluginName : undefined;
  const reason = typeof data?.reason === "string" ? data.reason : "processar esta etapa";
  return { toolCallId, name, pluginId, pluginName, reason };
}

function extractToolStatus(event: WorkflowEvent): string {
  const data = event.data as Record<string, unknown> | undefined;
  return typeof data?.status === "string" ? data.status : "";
}

function formatToolProgressMessage(event: WorkflowEvent, status: ToolProgressStatus): string {
  return formatToolProgressMessageFromTool(extractToolProgress(event), status);
}

function formatToolProgressMessageFromTool(tool: ToolProgress, status: ToolProgressStatus): string {
  const label = tool.name;
  if (status === "planned") return `Vou usar ${label} para ${tool.reason}.`;
  if (status === "running") return `Executando ${label} agora.`;
  if (status === "success") return `Usei ${label} com sucesso.`;
  return `Nao consegui usar ${label}.`;
}

function writeToolProgressLifecycle(reply: FastifyReply, tool: ToolProgress): void {
  const statuses: ToolProgressStatus[] = tool.status === "failed"
    ? ["planned", "running", "failed"]
    : ["planned", "running", "success"];
  for (const status of statuses) {
    writeStreamEvent(reply, {
      type: "progress",
      status,
      message: formatToolProgressMessageFromTool(tool, status),
      tool,
    });
  }
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
    await delay(30);
  }
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

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object" || Array.isArray(content)) return "";
  const record = content as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.content === "string") return record.content;
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

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
