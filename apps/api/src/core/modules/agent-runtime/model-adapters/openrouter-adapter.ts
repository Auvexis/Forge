import { AgentRuntimeError } from "../agent-errors.ts";
import type { AgentModelAdapter, AgentModelInvokeInput, AgentModelMessage } from "./agent-model-adapter.ts";
import type { FetchLike, RuntimeChatModel } from "./openai-adapter.ts";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

export class OpenRouterAdapter implements AgentModelAdapter {
  private readonly fetch: FetchLike;

  constructor(options: { fetch?: FetchLike } = {}) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async invokeText(input: AgentModelInvokeInput): Promise<string> {
    return extractText(await this.chat(input));
  }

  async invokeJson<T extends object>(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<T> {
    const body = await this.chat(input, schema);
    try {
      return parseOpenRouterJson<T>(extractText(body));
    } catch (error) {
      throw new AgentRuntimeError(
        `OpenRouter returned invalid JSON: ${safeMessage(error)}`,
        "AGENT_MODEL_JSON_INVALID",
        "Model returned invalid JSON",
        502,
      );
    }
  }

  generateFinalResponse(input: AgentModelInvokeInput): Promise<string> {
    return this.invokeText(input);
  }

  createChatModel(input: Omit<AgentModelInvokeInput, "messages">): RuntimeChatModel {
    return {
      invoke: async (messages, options) => ({ content: await this.invokeText({ ...input, messages, abortSignal: options?.signal }) }),
      invokeJson: (jsonInput, schema, options) => this.invokeJson({ ...input, messages: jsonInput.messages, abortSignal: options?.signal }, schema),
      generateFinalResponse: (finalInput, options) => this.generateFinalResponse({ ...input, messages: finalInput.messages, abortSignal: options?.signal }),
    };
  }

  private async chat(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<OpenRouterResponse> {
    const apiKey = input.credentials?.api_key ?? input.credentials?.apiKey ?? input.credentials?.token;
    if (!apiKey) throw new AgentRuntimeError("Missing OpenRouter credentials", "AGENT_MODEL_CREDENTIAL_MISSING", "Model credentials are missing", 400);

    const body: Record<string, unknown> = {
        model: input.model,
        messages: input.messages.map(toOpenRouterMessage),
        ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
        ...(input.maxTokens !== undefined ? { max_tokens: input.maxTokens } : {}),
        ...(schema ? {
          response_format: {
            type: "json_schema",
            json_schema: { name: "fabric_agent_decision", strict: true, schema },
          },
        } : {}),
        ...(input.thinkingEnabled === true ? { reasoning: input.thinkingRequest?.reasoning ?? { enabled: true } } : {}),
    };
    const request = (payload: Record<string, unknown>) => this.fetch(`${normalizeOpenRouterBaseUrl(input.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(input.credentials?.http_referer ? { "HTTP-Referer": input.credentials.http_referer } : {}),
        "X-Title": input.credentials?.x_title || "Fabric",
      },
      signal: input.abortSignal,
      body: JSON.stringify(payload),
    });
    let response = await request(body);

    if (!response.ok && schema && [400, 404, 422].includes(response.status)) {
      response = await request({ ...body, response_format: { type: "json_object" } });
    }
    if (!response.ok && schema && [400, 404, 422].includes(response.status)) {
      const { response_format: _unsupportedFormat, ...promptOnlyBody } = body;
      response = await request(promptOnlyBody);
    }

    if (!response.ok) {
      const detail = await providerError(response);
      throw new AgentRuntimeError(
        `OpenRouter API error: ${response.status} ${detail}`,
        "AGENT_MODEL_PROVIDER_ERROR",
        `OpenRouter model request failed: ${detail}`,
        502,
      );
    }
    return response.json() as Promise<OpenRouterResponse>;
  }
}

export function parseOpenRouterJson<T extends object>(text: string): T {
  const normalized = stripJsonFence(text.trim());
  const parsed = JSON.parse(normalized);
  const value = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object or a non-empty array of JSON objects");
  }
  return value as T;
}

function stripJsonFence(value: string): string {
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? value;
}

export function normalizeOpenRouterBaseUrl(baseUrl?: string): string {
  return (baseUrl?.trim() || "https://openrouter.ai/api/v1").replace(/\/+chat\/completions\/?$/, "").replace(/\/+$/, "");
}

export function toOpenRouterMessage(message: AgentModelMessage): Record<string, unknown> {
  if (message.role === "assistant" && message.tool_calls?.length) {
    return { role: "assistant", content: message.content || null, tool_calls: message.tool_calls.map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: JSON.stringify(call.arguments) } })) };
  }
  if (message.role === "tool" && message.tool_call_id) return { role: "tool", tool_call_id: message.tool_call_id, content: message.content };
  if (message.role === "tool") return { role: "user", content: `Tool result${message.name ? ` from ${message.name}` : ""}:\n${message.content}` };
  return { role: message.role, content: message.content };
}

function extractText(body: OpenRouterResponse): string {
  const content = body.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => typeof part === "string" ? part : part && typeof part === "object" && "text" in part ? String(part.text) : "").join("");
  return "";
}

async function providerError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const body = JSON.parse(text);
    const error = body?.error;
    const raw = parseNestedProviderError(error?.metadata?.raw);
    const provider = safeOptionalMessage(error?.metadata?.provider_name ?? error?.metadata?.provider);
    const primary = safeOptionalMessage(raw ?? error?.message ?? body?.message);
    return [primary, provider ? `provider: ${provider}` : ""]
      .filter(Boolean)
      .join("; ") || safeMessage(response.statusText);
  } catch {
    return safeMessage(text || response.statusText);
  }
}

function parseNestedProviderError(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed?.error?.message ?? parsed?.message ?? value;
  } catch {
    return value;
  }
}

function safeOptionalMessage(value: unknown): string {
  return value === undefined || value === null ? "" : safeMessage(value);
}

function safeMessage(value: unknown): string {
  return String(value instanceof Error ? value.message : value).replace(/\s+/g, " ").trim().slice(0, 500) || "Unknown error";
}
