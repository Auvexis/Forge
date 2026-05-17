import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { ProfilePasswordService } from "../profiles/profile-password-service.ts";
import { ProfileStore } from "../profiles/profile-store.ts";
import type { ActiveProfileService, SwitchProfileInput } from "../profiles/active-profile-service.ts";
import { sailorHomePaths } from "../runtime/sailor-home.ts";

interface SwitchProfileService {
  switchProfile(input: SwitchProfileInput): Promise<unknown>;
}

export interface ProfilesRoutesOptions {
  store?: ProfileStore;
  passwordService?: ProfilePasswordService;
  activeProfileService?: SwitchProfileService | ActiveProfileService;
}

const CreateProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  avatarEmoji: z.string(),
  email: z.string().nullable().optional(),
});

const UpdateProfileSchema = z.object({
  name: z.string().optional(),
  avatarEmoji: z.string().optional(),
  email: z.string().nullable().optional(),
});

const PasswordSchema = z.object({
  password: z.string().min(1),
});

export default async function profilesRoutes(
  fastify: FastifyInstance,
  options: ProfilesRoutesOptions = {},
) {
  const store = options.store ?? new ProfileStore({ sailorHome: sailorHomePaths.home });
  const passwordService = options.passwordService ?? new ProfilePasswordService({ store });
  const activeProfileService = options.activeProfileService;

  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  function sendError(reply: FastifyReply, statusCode: number, message: string, error: string) {
    return sendResponse(reply, {
      status_code: statusCode,
      message,
      error,
      data: null,
    });
  }

  fastify.get("/profiles", async (_req, reply) =>
    sendResponse(reply, {
      status_code: 200,
      message: "Profiles fetched successfully",
      error: null,
      data: store.listProfiles(),
    }),
  );

  fastify.get("/profiles/current", async (_req, reply) =>
    sendResponse(reply, {
      status_code: 200,
      message: "Current profile fetched successfully",
      error: null,
      data: store.getCurrentProfile(),
    }),
  );

  fastify.post("/profiles", async (req, reply) => {
    const validation = CreateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(reply, 400, "Invalid profile payload", "PROFILE_VALIDATION_FAILED");
    }

    try {
      const created = store.createProfile(validation.data);
      return sendResponse(reply, {
        status_code: 201,
        message: "Profile created",
        error: null,
        data: created,
      });
    } catch (error: any) {
      return sendError(reply, 400, error.message, "PROFILE_VALIDATION_FAILED");
    }
  });

  fastify.patch("/profiles/:profileId", async (req, reply) => {
    const { profileId } = req.params as { profileId: string };
    const validation = UpdateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(reply, 400, "Invalid profile payload", "PROFILE_VALIDATION_FAILED");
    }

    try {
      const updated = store.updateProfile(profileId, validation.data);
      return sendResponse(reply, {
        status_code: 200,
        message: "Profile updated",
        error: null,
        data: updated,
      });
    } catch (error: any) {
      return sendError(reply, 400, error.message, "PROFILE_VALIDATION_FAILED");
    }
  });

  fastify.put("/profiles/:profileId/password", async (req, reply) => {
    const { profileId } = req.params as { profileId: string };
    const validation = PasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(reply, 400, "Invalid password payload", "PROFILE_VALIDATION_FAILED");
    }

    try {
      passwordService.setPassword(profileId, validation.data.password);
      return sendResponse(reply, {
        status_code: 200,
        message: "Profile password set",
        error: null,
        data: store.getProfile(profileId),
      });
    } catch (error: any) {
      return sendError(reply, 400, error.message, "PROFILE_VALIDATION_FAILED");
    }
  });

  fastify.delete("/profiles/:profileId/password", async (req, reply) => {
    const { profileId } = req.params as { profileId: string };
    try {
      passwordService.removePassword(profileId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Profile password removed",
        error: null,
        data: store.getProfile(profileId),
      });
    } catch (error: any) {
      return sendError(reply, 400, error.message, "PROFILE_VALIDATION_FAILED");
    }
  });

  fastify.post("/profiles/:profileId/verify-password", async (req, reply) => {
    const { profileId } = req.params as { profileId: string };
    const validation = PasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(reply, 400, "Invalid password payload", "PROFILE_VALIDATION_FAILED");
    }

    const valid = passwordService.verifyPassword({
      profileId,
      password: validation.data.password,
    });
    if (!valid) {
      return sendError(reply, 401, "Invalid profile password", "PROFILE_PASSWORD_INVALID");
    }

    return sendResponse(reply, {
      status_code: 200,
      message: "Profile password verified",
      error: null,
      data: { valid: true },
    });
  });

  fastify.post("/profiles/:profileId/switch", async (req, reply) => {
    const { profileId } = req.params as { profileId: string };
    const password = typeof req.body === "object" && req.body && "password" in req.body
      ? String((req.body as { password?: unknown }).password ?? "")
      : undefined;

    try {
      let switched: unknown;
      if (activeProfileService) {
        switched = await activeProfileService.switchProfile({ profileId, password });
      } else {
        const manifest = store.getProfileManifest(profileId);
        if (!manifest) throw new Error("PROFILE_NOT_FOUND");
        if (manifest.password.enabled) {
          if (!password) throw new Error("PROFILE_PASSWORD_REQUIRED");
          if (!passwordService.verifyPassword({ profileId, password })) {
            throw new Error("PROFILE_PASSWORD_INVALID");
          }
        }
        switched = store.setCurrentProfile(profileId);
      }
      return sendResponse(reply, {
        status_code: 200,
        message: "Profile switched",
        error: null,
        data: switched,
      });
    } catch (error: any) {
      if (error.message === "PROFILE_PASSWORD_REQUIRED") {
        return sendError(reply, 401, "Profile password is required", "PROFILE_PASSWORD_REQUIRED");
      }
      if (error.message === "PROFILE_PASSWORD_INVALID") {
        return sendError(reply, 401, "Invalid profile password", "PROFILE_PASSWORD_INVALID");
      }
      return sendError(reply, 404, error.message, "PROFILE_NOT_FOUND");
    }
  });

  fastify.delete("/profiles/:profileId", async (req, reply) => {
    const { profileId } = req.params as { profileId: string };
    try {
      store.deleteProfile(profileId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Profile deleted",
        error: null,
        data: null,
      });
    } catch (error: any) {
      if (error.message.includes("active profile")) {
        return sendError(reply, 409, error.message, "PROFILE_ACTIVE_DELETE");
      }
      return sendError(reply, 404, error.message, "PROFILE_NOT_FOUND");
    }
  });
}
