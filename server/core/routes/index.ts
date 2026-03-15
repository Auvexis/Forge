import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../shared/models/api-response.model.ts";

export default async function rootRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (req, res): Promise<ApiResponse<null>> => {
    return {
      status_code: 200,
      message: "Forge API is running",
      error: null,
      data: null,
    };
  });
}
