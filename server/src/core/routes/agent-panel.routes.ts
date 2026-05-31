import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";
import { AgentRuntimeError, serializeAgentError } from "../modules/agent-runtime/agent-errors.ts";
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
