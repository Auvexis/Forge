import type { PluginContext } from "@auvexis/sailor-sdk";

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

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

function userMessages(prompt: string, system?: string) {
  return [
    ...(system?.trim() ? [{ role: "system", content: system.trim() }] : []),
    { role: "user", content: required(prompt, "prompt") },
  ];
}

export async function openRouterApi(
  context: PluginContext,
  method: string,
  path: string,
  body?: Record<string, any>,
): Promise<any> {
  const apiKey = context.credentials?.api_key?.trim();
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured. Go to Settings > Plugins > OpenRouter.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (context.credentials?.http_referer?.trim()) headers["HTTP-Referer"] = context.credentials.http_referer.trim();
  if (context.credentials?.x_title?.trim()) headers["X-Title"] = context.credentials.x_title.trim();

  const response = await fetch(`${OPENROUTER_API_BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`OpenRouter API error on '${path}': ${data.error?.message ?? data.message ?? response.statusText}`);
  }
  return data;
}

export function createOpenRouterMethods() {
  return {
    listModels: async (_params: Record<string, never> = {}, context?: PluginContext) =>
      openRouterApi(context!, "GET", "/models"),

    chatCompletion: async (
      params: { model: string; messages: any[] | string; temperature?: number; maxTokens?: number; providerPreferences?: string | Record<string, any> },
      context?: PluginContext,
    ) => openRouterApi(context!, "POST", "/chat/completions", {
      model: required(params.model, "model"),
      messages: typeof params.messages === "string" ? parseJson(params.messages, "messages") : params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      provider: parseJson(params.providerPreferences, "providerPreferences"),
    }),

    jsonChatCompletion: async (
      params: { model: string; prompt: string; system?: string; temperature?: number; maxTokens?: number },
      context?: PluginContext,
    ) => openRouterApi(context!, "POST", "/chat/completions", {
      model: required(params.model, "model"),
      messages: userMessages(params.prompt, params.system),
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      response_format: { type: "json_object" },
    }),

    routePrompt: async (
      params: { model: string; prompt: string; system?: string; providerPreferences?: string | Record<string, any>; temperature?: number; maxTokens?: number },
      context?: PluginContext,
    ) => openRouterApi(context!, "POST", "/chat/completions", {
      model: required(params.model, "model"),
      messages: userMessages(params.prompt, params.system),
      provider: parseJson(params.providerPreferences, "providerPreferences"),
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),

    compareModels: async (
      params: { models: string[] | string; prompt: string; system?: string; temperature?: number; maxTokens?: number },
      context?: PluginContext,
    ) => {
      const models = Array.isArray(params.models) ? params.models : params.models.split(",").map((model) => model.trim()).filter(Boolean);
      if (models.length < 2 || models.length > 4) throw new Error("'models' must include 2 to 4 models.");
      return Promise.all(models.map((model) => openRouterApi(context!, "POST", "/chat/completions", {
        model,
        messages: userMessages(params.prompt, params.system),
        temperature: params.temperature,
        max_tokens: params.maxTokens,
      })));
    },

    summarizeText: async (
      params: { model: string; text: string; system?: string; temperature?: number; maxTokens?: number },
      context?: PluginContext,
    ) => openRouterApi(context!, "POST", "/chat/completions", {
      model: required(params.model, "model"),
      messages: userMessages(`Summarize this text clearly:\n\n${required(params.text, "text")}`, params.system),
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens,
    }),

    extractJson: async (
      params: { model: string; text: string; responseSchema?: string; temperature?: number; maxTokens?: number },
      context?: PluginContext,
    ) => openRouterApi(context!, "POST", "/chat/completions", {
      model: required(params.model, "model"),
      messages: userMessages(`Extract JSON from this text. Schema guidance: ${params.responseSchema ?? "infer useful fields"}\n\n${required(params.text, "text")}`),
      response_format: { type: "json_object" },
      temperature: params.temperature ?? 0,
      max_tokens: params.maxTokens,
    }),

    moderatePromptLocalRules: async (
      params: { prompt: string; blockedTerms?: string | string[] },
      _context?: PluginContext,
    ) => {
      const prompt = required(params.prompt, "prompt").toLowerCase();
      const terms = params.blockedTerms
        ? (Array.isArray(params.blockedTerms) ? params.blockedTerms : params.blockedTerms.split(",")).map((term) => term.trim().toLowerCase()).filter(Boolean)
        : ["steal password", "exfiltrate", "malware", "credential theft"];
      const matched = terms.filter((term) => prompt.includes(term));
      return { allowed: matched.length === 0, matchedTerms: matched };
    },
  };
}
