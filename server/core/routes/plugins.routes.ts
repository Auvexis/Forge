import type { FastifyInstance } from "fastify";
import { db } from "../database.ts";
import type { ApiResponse } from "../shared/models/api-response.model.ts";
import type { PluginModel } from "../shared/models/plugin.model.ts";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { executePluginMethod } from "../plugins/executor.ts";

export default async function pluginsRoutes(fastify: FastifyInstance) {
  /**
   * Plugins
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
        .all() as PluginModel[];

      const cleanPlugins: PluginModel[] = plugins.map((p: any) => ({
        id: p.id,
        name: p.name,
        enabled: Boolean(p.enabled),
        version: p.version,
        author: p.author,
        config: p.config ? JSON.parse(p.config) : {},
      }));

      return {
        status_code: 200,
        message: "Plugins fetched successfully",
        error: null,
        data: cleanPlugins,
      };
    },
  );

  /**
   * Execute plugin method
   */
  fastify.post(
    "/plugins/:pluginId/execute",
    async (req, res): Promise<ApiResponse<any>> => {
      const { pluginId } = req.params as { pluginId: string };
      const { method, params } = req.body as { method: string; params: any[] };

      try {
        const result = await executePluginMethod(pluginId, method, params);

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
  const pluginsDir = path.join(__dirname, "../plugins");

  for (const dir of fs.readdirSync(pluginsDir)) {
    const pluginPath = path.join(pluginsDir, dir);

    if (!fs.statSync(pluginPath).isDirectory()) {
      continue;
    }

    const routesPath = path.join(pluginPath, "routes.ts");

    if (!fs.existsSync(routesPath)) {
      continue;
    }

    try {
      const routes = await import(pathToFileURL(routesPath).href);

      if (routes.default) {
        fastify.register(routes.default);
        console.log(`[FORGE | PLUGINS]: Loaded routes for plugin ${dir}`);
      }
    } catch (error) {
      console.error(`[FORGE | PLUGINS]: Failed to load ${dir}`, error);
    }
  }
}
