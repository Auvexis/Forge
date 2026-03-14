import { FastifyInstance } from "fastify";
import { db } from "../database";
import { ApiResponse } from "../shared/models/api-response.model";
import { PluginModel } from "../shared/models/plugin.model";

export default async function pluginsRoutes(fastify: FastifyInstance) {
  /**
   * Get all plugins
   */
  fastify.get(
    "/plugins",
    async (req, res): Promise<ApiResponse<PluginModel[]>> => {
      const plugins = db.prepare("SELECT * FROM plugins").all();

      const cleanPlugins: PluginModel[] = plugins.map((p: any) => ({
        id: p.id,
        name: p.name,
        config: p.config ? JSON.parse(p.config) : {},
        enabled: Boolean(p.enabled),
      }));

      return {
        status_code: 200,
        message: "Plugins fetched successfully",
        error: null,
        data: cleanPlugins,
      };
    },
  );
}
