import type { FastifyInstance, FastifyReply } from "fastify";
import fs from "node:fs";
import { z } from "zod";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { ProfileStore } from "../profiles/profile-store.ts";
import { resolveProfilePaths } from "../profiles/profile-paths.ts";
import { sailorHomePaths } from "../runtime/sailor-home.ts";
import { PluginBlueprintRepository } from "../modules/plugin-creator/plugin-blueprint-repository.ts";
import { PluginCreatorEngine } from "../modules/plugin-creator/plugin-creator-engine.ts";
import { PluginScaffoldService } from "../modules/plugin-creator/plugin-scaffold-service.ts";
import { PluginTestRunner } from "../modules/plugin-creator/plugin-test-runner.ts";
import { PluginVersionService } from "../modules/plugin-creator/plugin-version-service.ts";
import { PluginPublishService } from "../modules/plugin-creator/plugin-publish-service.ts";
import { PluginExportService } from "../modules/plugin-creator/plugin-export-service.ts";
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

const testMethodSchema = z.object({
  methodId: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
  credentials: z.record(z.string(), z.unknown()).default({}),
  timeoutMs: z.number().int().positive().optional(),
});

const rollbackSchema = z.object({
  snapshotId: z.string().min(1),
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

  fastify.post("/plugin-creator/blueprints/:id/test-method", async (req, reply) => {
    const { id } = req.params as { id: string };
    const validation = testMethodSchema.safeParse(req.body);
    if (!validation.success) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Invalid plugin creator test payload",
        error: formatZodError(validation.error),
        data: null,
      });
    }

    try {
      const result = await getEngine().testMethod(id, validation.data);
      return sendResponse(reply, {
        status_code: 200,
        message: "Plugin creator method tested",
        error: null,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      if (message === "blueprint_not_found") {
        return sendResponse(reply, {
          status_code: 404,
          message: "Plugin creator blueprint not found",
          error: "blueprint_not_found",
          data: null,
        });
      }

      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to test plugin creator method",
        error: message,
        data: null,
      });
    }
  });

  fastify.post("/plugin-creator/blueprints/:id/generate-preview", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const preview = getEngine().generatePreview(id);
      return sendResponse(reply, {
        status_code: 200,
        message: "Plugin creator preview generated",
        error: null,
        data: preview,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      if (message === "blueprint_not_found") {
        return sendResponse(reply, {
          status_code: 404,
          message: "Plugin creator blueprint not found",
          error: "blueprint_not_found",
          data: null,
        });
      }

      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to generate plugin creator preview",
        error: message,
        data: null,
      });
    }
  });

  fastify.get("/plugin-creator/blueprints/:id/versions", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const versions = getEngine().listVersions(id);
      return sendResponse(reply, {
        status_code: 200,
        message: "Plugin creator versions fetched successfully",
        error: null,
        data: versions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      if (message === "blueprint_not_found") {
        return sendResponse(reply, {
          status_code: 404,
          message: "Plugin creator blueprint not found",
          error: "blueprint_not_found",
          data: null,
        });
      }

      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to fetch plugin creator versions",
        error: message,
        data: null,
      });
    }
  });

  fastify.post("/plugin-creator/blueprints/:id/rollback", async (req, reply) => {
    const { id } = req.params as { id: string };
    const validation = rollbackSchema.safeParse(req.body);
    if (!validation.success) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Invalid plugin creator rollback payload",
        error: formatZodError(validation.error),
        data: null,
      });
    }

    try {
      const blueprint = getEngine().rollback(id, validation.data.snapshotId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Plugin creator blueprint rolled back",
        error: null,
        data: blueprint,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      if (message === "blueprint_not_found") {
        return sendResponse(reply, {
          status_code: 404,
          message: "Plugin creator blueprint not found",
          error: "blueprint_not_found",
          data: null,
        });
      }

      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to rollback plugin creator blueprint",
        error: message,
        data: null,
      });
    }
  });

  fastify.post("/plugin-creator/blueprints/:id/publish", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const release = getEngine().publish(id);
      return sendResponse(reply, {
        status_code: 200,
        message: "Plugin creator blueprint published",
        error: null,
        data: release,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      if (message === "blueprint_not_found") {
        return sendResponse(reply, {
          status_code: 404,
          message: "Plugin creator blueprint not found",
          error: "blueprint_not_found",
          data: null,
        });
      }

      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to publish plugin creator blueprint",
        error: message,
        data: null,
      });
    }
  });

  fastify.get("/plugin-creator/blueprints/:id/export.zip", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const exported = getEngine().exportZip(id);
      return reply
        .code(200)
        .type("application/zip")
        .header("content-disposition", `attachment; filename="${id}.zip"`)
        .send(fs.readFileSync(exported.zipPath));
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      if (message === "blueprint_not_found") {
        return sendResponse(reply, {
          status_code: 404,
          message: "Plugin creator blueprint not found",
          error: "blueprint_not_found",
          data: null,
        });
      }

      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to export plugin creator release",
        error: message,
        data: null,
      });
    }
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

  const repository = new PluginBlueprintRepository(profilePaths);
  const versionService = new PluginVersionService({ profilePaths, repository });
  return new PluginCreatorEngine({
    profilePaths,
    repository,
    scaffold: new PluginScaffoldService(),
    testRunner: new PluginTestRunner({ repository }),
    versionService,
    publishService: new PluginPublishService({ profilePaths, repository, versionService }),
    exportService: new PluginExportService({ profilePaths }),
  });
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
