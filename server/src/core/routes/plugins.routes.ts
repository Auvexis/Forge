import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { PluginManager } from "../plugins/manager.ts";
import { PluginExecutor } from "../plugins/executor.ts";
import type { PluginModel } from "../../shared/models/plugin.model.ts";

export default async function pluginsRoutes(fastify: FastifyInstance) {
  /**
   * Load Plugins Routes
   */
  await loadPluginsRoutes(fastify);

  /**
   * Get all plugins
   */
  fastify.get("/plugins", async (req, res): Promise<ApiResponse<PluginModel[]>> => {
    return {
      status_code: 200,
      message: "Plugins fetched successfully",
      error: null,
      data: PluginManager.getPlugins(),
    };
  });

  /**
   * Get plugin by id
   * @param pluginId - The id of the plugin to get
   */
  fastify.get(
    "/plugins/:pluginId",
    async (req, res): Promise<ApiResponse<PluginModel>> => {
      const { pluginId } = req.params as { pluginId: string };

      try {
        const plugin = PluginManager.getPlugin(pluginId);

        return {
          status_code: 200,
          message: "Plugin fetched successfully",
          error: null,
          data: plugin,
        };
      } catch (error: any) {
        return {
          status_code: 404,
          message: "Plugin not found",
          error: error.message,
          data: null,
        };
      }
    },
  );

  /**
   * Execute plugin method
   * @param pluginId - The id of the plugin to execute
   * @param method - The method to execute
   * @param params - The parameters to pass to the method
   */
  fastify.post(
    "/plugins/:pluginId/execute",
    async (req, res): Promise<ApiResponse<any>> => {
      const { pluginId } = req.params as { pluginId: string };
      const { method, params } = req.body as { method: string; params: Record<string, any> };

      try {
        const result = await PluginExecutor.execute(pluginId, method, params);

        return {
          status_code: 200,
          message: "Plugin method executed successfully",
          error: null,
          data: result,
        };
      } catch (error: any) {
        return {
          status_code: 500,
          message: "Failed to execute plugin method",
          error: error.message,
          data: null,
        };
      }
    },
  );
}

async function loadPluginsRoutes(fastify: FastifyInstance) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pluginsDir = path.join(__dirname, "../../plugins");

  async function loadRoutesRecursively(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await loadRoutesRecursively(fullPath);
      } else if (entry.isFile() && entry.name === "routes.ts") {
        try {
          const routes = await import(pathToFileURL(fullPath).href);
          if (routes.default) {
            fastify.register(routes.default);
            console.log(
              `[FORGE | PLUGINS]: Loaded routes from ${dir.split("\\")[dir.split("\\").length - 1]}`,
            );
          }
        } catch (error) {
          console.error(
            `[FORGE | PLUGINS]: Failed to load routes from ${dir.split("\\")[dir.split("\\").length - 1]}`,
            error,
          );
        }
      }
    }
  }

  await loadRoutesRecursively(pluginsDir);
}
