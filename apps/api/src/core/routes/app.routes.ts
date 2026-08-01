import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { AppRepository } from "../modules/app/app-repository.ts";
import { PublicUrlService } from "../modules/app/public-url-service.ts";
import { ProfileStore } from "../profiles/profile-store.ts";
import { fabricHomePaths } from "../runtime/fabric-home.ts";
import { z } from "zod";

export interface AppRoutesOptions {
  profileStore?: ProfileStore;
}

export default async function appRoutes(fastify: FastifyInstance, options: AppRoutesOptions = {}) {
  const profileStore = options.profileStore ?? new ProfileStore({ fabricHome: fabricHomePaths.home });
  /**
   * Helper to send standardized responses with proper HTTP status codes
   */
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  /**
   * GET /app/info
   * Exposes public backend configuration (e.g., PUBLIC_URL)
   */
  fastify.get("/app/info", async (_req, reply) => {
    const publicUrlConfig = PublicUrlService.getConfig();
    return sendResponse(reply, {
      status_code: 200,
      message: "App info fetched successfully",
      error: null,
      data: { ...publicUrlConfig, currentProfile: profileStore.getCurrentProfile() },
    });
  });

  // ──────────── Settings ────────────────────────────────────────────────────

  /**
   * GET /app/settings
   * Returns all key-value settings (theme, server_name, etc.)
   */
  fastify.get("/app/settings", async (_req, reply) => {
    const data = AppRepository.getAllSettings();
    data.public_url = PublicUrlService.getSettingsValue();
    data.public_url_restart_required = PublicUrlService.getConfig().restartRequired;
    data.public_url_locked = PublicUrlService.getConfig().locked;
    return sendResponse(reply, {
      status_code: 200,
      message: "Settings fetched successfully",
      error: null,
      data,
    });
  });

  /**
   * PUT /app/settings/:key
   * Upserts a single setting value (JSON body: { value: any })
   */
  const PutSettingSchema = z.object({ value: z.unknown() });

  fastify.put("/app/settings/:key", async (req, reply) => {
    const { key } = req.params as { key: string };
    const validation = PutSettingSchema.safeParse(req.body);

    if (!validation.success) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Invalid request body — expected { value: any }",
        error: validation.error.issues.map((e) => e.message).join(", "),
        data: null,
      });
    }

    if (key === PublicUrlService.settingKey) {
      try {
        const result = PublicUrlService.savePending(validation.data.value);
        return sendResponse(reply, {
          status_code: 200,
          message: "Public URL saved. Restart Fabric to apply it.",
          error: null,
          data: result,
        });
      } catch (error: any) {
        return sendResponse(reply, {
          status_code: 400,
          message: error.message,
          error: error.message,
          data: null,
        });
      }
    }

    AppRepository.setSetting(key, validation.data.value);
    return sendResponse(reply, {
      status_code: 200,
      message: "Setting saved",
      error: null,
      data: null,
    });
  });

  /**
   * DELETE /app/settings/:key
   */
  fastify.delete("/app/settings/:key", async (req, reply) => {
    const { key } = req.params as { key: string };

    if (key === PublicUrlService.settingKey) {
      try {
        const result = PublicUrlService.clearPending();
        return sendResponse(reply, {
          status_code: 200,
          message: "Public URL cleared. Restart Fabric to apply it.",
          error: null,
          data: result,
        });
      } catch (error: any) {
        return sendResponse(reply, {
          status_code: 400,
          message: error.message,
          error: error.message,
          data: null,
        });
      }
    }

    AppRepository.deleteSetting(key);
    return sendResponse(reply, {
      status_code: 200,
      message: "Setting deleted",
      error: null,
      data: null,
    });
  });

  // ──────────── Global Variables ────────────────────────────────────────────

  /**
   * GET /app/variables
   * Returns all global variables (with metadata) for the settings UI.
   */
  fastify.get("/app/variables", async (_req, reply) => {
    const data = AppRepository.getAllGlobalVariables();
    return sendResponse(reply, {
      status_code: 200,
      message: "Global variables fetched successfully",
      error: null,
      data,
    });
  });

  /**
   * PUT /app/variables/:key
   * Creates or updates a global variable.
   * Body: { value: string, description?: string }
   */
  const PutVariableSchema = z.object({
    value: z.string(),
    description: z.string().optional().default(""),
  });

  fastify.put("/app/variables/:key", async (req, reply) => {
    const { key } = req.params as { key: string };

    if (!key || !/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Variable key must be a valid identifier (letters, digits, underscores)",
        error: null,
        data: null,
      });
    }

    const validation = PutVariableSchema.safeParse(req.body);
    if (!validation.success) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Invalid request body",
        error: validation.error.issues.map((e) => e.message).join(", "),
        data: null,
      });
    }

    const variable = AppRepository.setGlobalVariable(
      key,
      validation.data.value,
      validation.data.description,
    );

    return sendResponse(reply, {
      status_code: 200,
      message: "Global variable saved",
      error: null,
      data: variable,
    });
  });

  /**
   * DELETE /app/variables/:key
   */
  fastify.delete("/app/variables/:key", async (req, reply) => {
    const { key } = req.params as { key: string };
    AppRepository.deleteGlobalVariable(key);
    return sendResponse(reply, {
      status_code: 200,
      message: "Global variable deleted",
      error: null,
      data: null,
    });
  });
}
