import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { CredentialStore } from "../modules/plugins/credential-store.ts";
import { z } from "zod";

export default async function credentialsRoutes(fastify: FastifyInstance) {
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  // ──────────── Credentials ─────────────────────────────────────────────────

  /**
   * GET /credentials/:pluginId
   * Returns the stored credential fields for a specific plugin (masked for display).
   */
  fastify.get("/credentials/:pluginId", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };
    const fields = CredentialStore.getCredentials(pluginId);

    if (!fields) {
      return sendResponse(reply, {
        status_code: 404,
        message: `No credential found for plugin: ${pluginId}`,
        error: "NOT_FOUND",
        data: null,
      });
    }

    return sendResponse(reply, {
      status_code: 200,
      message: "Credential fetched successfully",
      error: null,
      data: { plugin_id: pluginId, fields },
    });
  });

  /**
   * PUT /credentials/:pluginId
   * Creates or updates credential fields for a plugin.
   * Body: { fields: Record<string, string> }
   */
  const PutCredentialSchema = z.object({
    fields: z.record(z.string(), z.string()),
  });

  fastify.put("/credentials/:pluginId", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };
    const validation = PutCredentialSchema.safeParse(req.body);

    if (!validation.success) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Invalid body — expected { fields: Record<string, string> }",
        error: validation.error.issues.map((e) => e.message).join(", "),
        data: null,
      });
    }

    // Merge with existing credentials so partial updates are safe
    const existing = CredentialStore.getCredentials(pluginId) ?? {};
    const merged = { ...existing, ...validation.data.fields };
    CredentialStore.saveCredentials(pluginId, merged);

    return sendResponse(reply, {
      status_code: 200,
      message: "Credential saved",
      error: null,
      data: { plugin_id: pluginId, fields: merged },
    });
  });

  /**
   * DELETE /credentials/:pluginId
   * Removes all stored credentials (and tokens) for a plugin.
   */
  fastify.delete("/credentials/:pluginId", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };
    CredentialStore.deleteCredentials(pluginId);
    return sendResponse(reply, {
      status_code: 200,
      message: "Credential deleted",
      error: null,
      data: null,
    });
  });
}
