import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { ProfileStore } from "../profiles/profile-store.ts";
import { resolveProfilePaths } from "../profiles/profile-paths.ts";
import { sailorHomePaths } from "../runtime/sailor-home.ts";
import { PluginBlueprintRepository } from "../modules/plugin-creator/plugin-blueprint-repository.ts";
import { PluginCreatorEngine } from "../modules/plugin-creator/plugin-creator-engine.ts";
import { PluginScaffoldService } from "../modules/plugin-creator/plugin-scaffold-service.ts";
import { parsePluginBlueprint } from "../modules/plugin-creator/plugin-blueprint-validation.ts";
import type { PluginBlueprint } from "../modules/plugin-creator/plugin-blueprint-types.ts";

export interface PluginCreatorRoutesOptions {
  engine?: PluginCreatorEngine;
  profileStore?: ProfileStore;
}

const createBlueprintSchema = z.object({
  handle: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid plugin handle"),
  name: z.string().min(1),
  description: z.string(),
  icon: z.string().optional(),
  iconDark: z.string().optional(),
  iconLight: z.string().optional(),
  includeDefaultMethod: z.boolean().optional(),
});

export default async function pluginCreatorRoutes(
  fastify: FastifyInstance,
  options: PluginCreatorRoutesOptions = {},
) {
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  const getEngine = () => options.engine ?? createEngineForCurrentProfile(options.profileStore);

  fastify.get("/plugin-creator/blueprints", async (_req, reply) => {
    return sendResponse(reply, {
      status_code: 200,
      message: "Plugin creator blueprints fetched successfully",
      error: null,
      data: getEngine().listBlueprints(),
    });
  });

  fastify.post("/plugin-creator/blueprints", async (req, reply) => {
    const validation = createBlueprintSchema.safeParse(req.body);
    if (!validation.success) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Invalid plugin creator blueprint payload",
        error: formatZodError(validation.error),
        data: null,
      });
    }

    try {
      const blueprint = getEngine().createBlueprint(validation.data);
      return sendResponse(reply, {
        status_code: 201,
        message: "Plugin creator blueprint created",
        error: null,
        data: blueprint,
      });
    } catch (error) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to create plugin creator blueprint",
        error: error instanceof Error ? error.message : "unknown_error",
        data: null,
      });
    }
  });

  fastify.get("/plugin-creator/blueprints/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const blueprint = getEngine().getBlueprint(id);
    if (!blueprint) {
      return sendResponse(reply, {
        status_code: 404,
        message: "Plugin creator blueprint not found",
        error: "blueprint_not_found",
        data: null,
      });
    }

    return sendResponse(reply, {
      status_code: 200,
      message: "Plugin creator blueprint fetched successfully",
      error: null,
      data: blueprint,
    });
  });

  fastify.put("/plugin-creator/blueprints/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const blueprint = parsePluginBlueprint(req.body);
      const updated = getEngine().updateBlueprint(id, blueprint);
      return sendResponse(reply, {
        status_code: 200,
        message: "Plugin creator blueprint updated",
        error: null,
        data: updated,
      });
    } catch (error) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to update plugin creator blueprint",
        error: error instanceof Error ? error.message : "unknown_error",
        data: null,
      });
    }
  });
}

function createEngineForCurrentProfile(profileStore = new ProfileStore({ sailorHome: sailorHomePaths.home })): PluginCreatorEngine {
  const currentProfile = profileStore.getCurrentProfile();
  const profileId = currentProfile?.id ?? "default";
  const profilePaths = resolveProfilePaths({ profilesDir: sailorHomePaths.profilesDir, profileId });

  return new PluginCreatorEngine({
    repository: new PluginBlueprintRepository(profilePaths),
    scaffold: new PluginScaffoldService(),
  });
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
