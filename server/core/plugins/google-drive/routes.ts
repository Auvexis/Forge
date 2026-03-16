import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";

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
}
