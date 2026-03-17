import type { FastifyInstance } from "fastify";
import { db } from "../database.ts";
import type { ApiResponse } from "../shared/models/api-response.model.ts";
import type {
  PluginDBRow,
  PluginModel,
} from "../shared/models/plugin.model.ts";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { PluginManager } from "../plugins/manager.ts";
import { PluginExecutor } from "../plugins/executor.ts";

export default async function pluginsRoutes(fastify: FastifyInstance) {
  /**
   * Load Plugins Routes
   */
  await loadPluginsRoutes(fastify);

  /**
   * Get all plugins
   */
  fastify.get(
    "/plugins",
    async (req, res): Promise<ApiResponse<PluginModel[]>> => {
      const plugins = db
        .prepare("SELECT * FROM plugins")
        .all() as PluginDBRow[];

      const cleanPlugins: PluginModel[] = plugins.map((p: PluginDBRow) => {
        const registeredPlugin = PluginManager.getPlugin(p.id);

        return {
          id: p.id,
          name: p.name,
          version: p.version,
          author: p.author,
          repository: p.repository || "",
          enabled: Boolean(p.enabled),
          config: p.config ? JSON.parse(p.config) : {},
          icon: p.icon || "",
          description: p.description || "",
          methods: registeredPlugin?.methods || {},
          manifest: registeredPlugin?.manifest || {},
        };
      });

      return {
        status_code: 200,
        message: "Plugins fetched successfully",
        error: null,
        data: cleanPlugins,
      };
    },
  );

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
      const { method, params } = req.body as { method: string; params: any[] };

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

  /**
   * Update plugin config
   * @param pluginId - The id of the plugin to update
   * @param config - The new config to set
   */
  fastify.put(
    "/plugins/:pluginId/config",
    async (req, res): Promise<ApiResponse<any>> => {
      const { pluginId } = req.params as { pluginId: string };
      const { config } = req.body as { config: Record<string, any> };

      try {
        const plugin = PluginManager.getPlugin(pluginId);

        if (!plugin) {
          return {
            status_code: 404,
            message: "Plugin not found",
            error: null,
            data: null,
          };
        }

        const currentConfig = plugin.config;

        const newConfig = {
          ...currentConfig,
          ...config,
        };

        PluginManager.updatePluginConfig(pluginId, newConfig);

        return {
          status_code: 200,
          message: "Plugin config updated successfully",
          error: null,
          data: newConfig,
        };
      } catch (error: any) {
        return {
          status_code: 500,
          message: "Failed to update plugin config",
          error: error.message,
          data: null,
        };
      }
    },
  );
}

async function loadPluginsRoutes(fastify: FastifyInstance) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pluginsDir = path.join(__dirname, "../plugins");

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
