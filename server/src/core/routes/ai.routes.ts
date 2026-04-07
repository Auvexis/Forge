import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { ollamaChat } from "../ai/ollama.ts";
import { db } from "../database.ts";
import {
  SYSTEM_PROMPT,
  type ChatBotMessage,
} from "../../shared/models/chatbot-message.model.ts";

export default async function aiRoutes(fastify: FastifyInstance) {
  /**
   * Chat with AI
   * @param prompt - The prompt to send to the AI
   * @returns The AI response
   */
  fastify.post("/ai/chat", async (req, res): Promise<ApiResponse<any>> => {
    const { previousMessages, newMessage } = req.body as {
      previousMessages?: ChatBotMessage[];
      newMessage: ChatBotMessage;
    };

    const ollamaConfig = db.prepare("SELECT * FROM ollama_config").get();
    if (!ollamaConfig)
      return {
        status_code: 500,
        message:
          "Ollama not configured. Please configure Ollama before using AI.",
        error: null,
        data: null,
      };

    try {
      const result = await ollamaChat([
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...(previousMessages ?? []).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: newMessage.content,
        },
      ]);

      return {
        status_code: 200,
        message: "Chat response",
        error: null,
        data: result.message.content ?? "",
      };
    } catch (error: any) {
      return {
        status_code: 500,
        message: "Failed to chat with AI",
        error: error.message,
        data: null,
      };
    }
  });
}
