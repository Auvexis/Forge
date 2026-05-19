import type { PluginContext } from "@auvexis/sailor-sdk";

const OPENAI_API_BASE = "https://api.openai.com";

function required(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`'${fieldName}' is required.`);
  return trimmed;
}

function parseJson(value: string | Record<string, any> | undefined, fieldName: string) {
  if (!value) return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error: any) {
    throw new Error(`Failed to parse '${fieldName}' as JSON: ${error.message}`);
  }
}

export async function openAiApi(
  context: PluginContext,
  method: string,
  path: string,
  body?: Record<string, any>,
): Promise<any> {
  const apiKey = context.credentials?.api_key?.trim();
  if (!apiKey) throw new Error("OpenAI API key is not configured. Go to Settings > Plugins > OpenAI.");

  const response = await fetch(`${OPENAI_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`OpenAI API error on '${path}': ${data.error?.message ?? data.message ?? response.statusText}`);
  }
  return data;
}

export function createOpenAiMethods() {
  return {
    listModels: async (_params: Record<string, never> = {}, context?: PluginContext) =>
      openAiApi(context!, "GET", "/v1/models"),

    createResponse: async (
      params: { model: string; input: string | any[]; instructions?: string; temperature?: number; maxOutputTokens?: number },
      context?: PluginContext,
    ) => openAiApi(context!, "POST", "/v1/responses", {
      model: required(params.model, "model"),
      input: params.input,
      instructions: params.instructions?.trim(),
      temperature: params.temperature,
      max_output_tokens: params.maxOutputTokens,
    }),

    chatCompletion: async (
      params: { model: string; messages: any[] | string; temperature?: number; maxTokens?: number },
      context?: PluginContext,
    ) => openAiApi(context!, "POST", "/v1/chat/completions", {
      model: required(params.model, "model"),
      messages: typeof params.messages === "string" ? parseJson(params.messages, "messages") : params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),

    structuredResponse: async (
      params: { model: string; input: string; schema: string | Record<string, any>; instructions?: string; temperature?: number; maxOutputTokens?: number },
      context?: PluginContext,
    ) => openAiApi(context!, "POST", "/v1/responses", {
      model: required(params.model, "model"),
      input: required(params.input, "input"),
      instructions: params.instructions?.trim(),
      temperature: params.temperature,
      max_output_tokens: params.maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name: "structured_response",
          schema: parseJson(params.schema, "schema"),
          strict: true,
        },
      },
    }),

    summarizeText: async (
      params: { model: string; text: string; instructions?: string; temperature?: number; maxOutputTokens?: number },
      context?: PluginContext,
    ) => openAiApi(context!, "POST", "/v1/responses", {
      model: required(params.model, "model"),
      input: `Summarize this text clearly:\n\n${required(params.text, "text")}`,
      instructions: params.instructions?.trim(),
      temperature: params.temperature ?? 0.2,
      max_output_tokens: params.maxOutputTokens,
    }),

    extractJson: async (
      params: { model: string; text: string; schema: string | Record<string, any>; instructions?: string; temperature?: number; maxOutputTokens?: number },
      context?: PluginContext,
    ) => openAiApi(context!, "POST", "/v1/responses", {
      model: required(params.model, "model"),
      input: `Extract JSON from this text:\n\n${required(params.text, "text")}`,
      instructions: params.instructions?.trim(),
      temperature: params.temperature ?? 0,
      max_output_tokens: params.maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name: "extracted_json",
          schema: parseJson(params.schema, "schema"),
          strict: true,
        },
      },
    }),

    classifyText: async (
      params: { model: string; text: string; labels: string | string[]; instructions?: string; temperature?: number; maxOutputTokens?: number },
      context?: PluginContext,
    ) => {
      const labels = Array.isArray(params.labels) ? params.labels : params.labels.split(",").map((label) => label.trim()).filter(Boolean);
      return openAiApi(context!, "POST", "/v1/responses", {
        model: required(params.model, "model"),
        input: `Classify this text into one of these labels: ${labels.join(", ")}\n\n${required(params.text, "text")}`,
        instructions: params.instructions?.trim(),
        temperature: params.temperature ?? 0,
        max_output_tokens: params.maxOutputTokens,
      });
    },

    generateImage: async (
      params: { model?: string; prompt: string; size?: string; quality?: string; n?: number },
      context?: PluginContext,
    ) => openAiApi(context!, "POST", "/v1/images/generations", {
      model: params.model?.trim() || "gpt-image-1",
      prompt: required(params.prompt, "prompt"),
      size: params.size?.trim(),
      quality: params.quality?.trim(),
      n: params.n ?? 1,
    }),
  };
}
