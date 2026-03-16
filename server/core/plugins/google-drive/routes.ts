import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { executePluginMethod } from "../executor.ts";
import { GoogleDrivePlugin } from "./index.ts";

export default async function googleDrivePluginRoutes(
  fastify: FastifyInstance,
) {
  /**
   * Check plugin status
   */
  fastify.get(
    "/plugins/google-drive/status",
    async (req, res): Promise<ApiResponse<null>> => {
      return {
        status_code: 200,
        message: "Google Drive plugin is active",
        error: null,
        data: null,
      };
    },
  );

  fastify.post(
    "/plugins/google-drive/execute",
    async (req, res): Promise<ApiResponse<any>> => {
      const { method, params } = req.body as {
        method: string;
        params: Record<string, any>;
      };

      const pluginId = GoogleDrivePlugin.id;

      const result = await executePluginMethod(pluginId, method, params);

      return {
        status_code: 200,
        message: "Google Drive plugin executed successfully",
        error: null,
        data: result,
      };
    },
  );
}
