import { db } from "../database.ts";
import type { OllamaConfigModel } from "../../shared/models/ollama-config.model.ts";

export async function ollamaChat(messages: any[]) {
  const config = db
    .prepare(`SELECT * FROM ollama_config LIMIT 1`)
    .get() as OllamaConfigModel | null;

  if (!config) {
    throw new Error("Ollama configuration not found");
  }

  const options = config.options ? JSON.parse(config.options) : {};

  const response = await fetch(`${config.host}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      options,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[FORGE | OLLAMA]: Ollama request failed:", text);

    throw new Error(`Ollama request failed: ${text}`);
  }

  const result = await response.json();

  return result;
}
