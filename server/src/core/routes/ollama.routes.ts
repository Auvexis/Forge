import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import type { OllamaConfigModel } from "../../shared/models/ollama-config.model.ts";
import { db } from "../database.ts";

export default async function ollamaRoutes(fastify: FastifyInstance) {
  /**
   * Get Ollama config
   */
  fastify.get(
    "/ollama/config",
    async (req, res): Promise<ApiResponse<OllamaConfigModel>> => {
      const row = db.prepare("SELECT * FROM ollama_config").get();
      if (!row)
        return {
          status_code: 404,
          message: "Ollama config not found",
          error: null,
          data: null,
        };

      return {
        status_code: 200,
        message: "Ollama config fetched successfully",
        error: null,
        data: row as OllamaConfigModel,
      };
    },
  );

  /**
   * Update Ollama config
   */
  fastify.post(
    "/ollama/config",
    async (req, res): Promise<ApiResponse<OllamaConfigModel>> => {
      const body = req.body as OllamaConfigModel;
      if (!body.model || !body.host) {
        return {
          status_code: 400,
          message: "Ollama config is invalid",
          error: "Missing model and/or host",
          data: null,
        };
      }

      const optionsString = body.options ? JSON.stringify(body.options) : null;

      /**
       * Delete existing config
       */
      db.prepare(`DELETE FROM ollama_config`).run();

      /**
       * Insert new config
       */
      db.prepare(
        `
        INSERT INTO ollama_config (model, host, options)
        VALUES (?, ?, ?)
      `,
      ).run(body.model, body.host, optionsString);

      return {
        status_code: 200,
        message: "Ollama config updated successfully",
        error: null,
        data: {
          host: body.host,
          model: body.model,
          options: body.options ?? null,
        },
      };
    },
  );
}
