import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { DatabaseManager } from "../database/index.ts";
import { AgentSessionRepository } from "../modules/agent-runtime/session/agent-session-repository.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";

export interface AgentSessionRoutesOptions {
  db?: Database.Database;
  getActiveProfileId?: () => string;
}

export default async function agentSessionRoutes(
  fastify: FastifyInstance,
  options: AgentSessionRoutesOptions = {},
) {
  const getProfileId = options.getActiveProfileId ??
    (() => activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default");
  const repository = new AgentSessionRepository(options.db ?? DatabaseManager.workflows);

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
