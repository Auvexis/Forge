import { AgentRuntimeError } from "../agent-errors.ts";
import type {
  AgentModelAdapter,
  AgentModelInvokeInput,
  AgentModelMessage,
} from "./agent-model-adapter.ts";

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export interface OllamaAdapterOptions {
  fetch?: FetchLike;
  keepAlive?: string | number;
}

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
  response?: unknown;
}

export class OllamaAdapter implements AgentModelAdapter {
  private readonly fetch: FetchLike;
  private readonly keepAlive?: string | number;

  constructor(options: OllamaAdapterOptions = {}) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.keepAlive = options.keepAlive ?? process.env.FABRIC_OLLAMA_KEEP_ALIVE;
  }

  async invokeText(input: AgentModelInvokeInput): Promise<string> {
    const body = await this.chat(input);
    return extractOllamaText(body);
  }

  async invokeJson<T extends object>(
    input: AgentModelInvokeInput,
    schema?: Record<string, any>,
  ): Promise<T> {
    const body = await this.chat(input, schema ?? "json");
    const text = extractOllamaText(body).trim();
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected a JSON object");
      }
      return parsed as T;
    } catch (error) {
      throw new AgentRuntimeError(
        `Ollama returned invalid JSON: ${safeErrorMessage(error)}`,
        "AGENT_MODEL_JSON_INVALID",
        "Model returned invalid JSON",
        502,
      );
    }
  }

  generateFinalResponse(input: AgentModelInvokeInput): Promise<string> {
    return this.invokeText(input);
  }

  createChatModel(input: Omit<AgentModelInvokeInput, "messages">): {
    invoke(messages: AgentModelMessage[], options?: { signal?: AbortSignal }): Promise<{ content: string }>;
    invokeJson<T extends object>(
      jsonInput: { messages: AgentModelMessage[] },
      schema?: Record<string, any>,
      options?: { signal?: AbortSignal },
    ): Promise<T>;
    generateFinalResponse(
      finalInput: { messages: AgentModelMessage[] },
      options?: { signal?: AbortSignal },
    ): Promise<string>;
  } {
    return {
      invoke: async (messages, options) => ({
        content: await this.invokeText({ ...input, messages, abortSignal: options?.signal ?? input.abortSignal }),
      }),
      invokeJson: async (jsonInput, schema, options) =>
        this.invokeJson({ ...input, messages: jsonInput.messages, abortSignal: options?.signal ?? input.abortSignal }, schema),
      generateFinalResponse: async (finalInput, options) =>
        this.generateFinalResponse({ ...input, messages: finalInput.messages, abortSignal: options?.signal ?? input.abortSignal }),
    };
  }

  private async chat(input: AgentModelInvokeInput, format?: "json" | Record<string, any>): Promise<OllamaChatResponse> {
    const keepAlive = input.keepAlive ?? this.keepAlive;
    const options = buildOllamaOptions(input);
    const response = await this.fetch(`${normalizeOllamaHost(input.baseUrl)}/api/chat`, {
      method: "POST",
      headers: ollamaHeaders(input.credentials),
      signal: input.abortSignal,
      body: JSON.stringify({
        model: input.model,
        messages: input.messages.map(toOllamaMessage),
        stream: false,
        think: resolveThink(input),
        ...(keepAlive !== undefined ? { keep_alive: keepAlive } : {}),
        ...(format ? { format } : {}),
        ...(Object.keys(options).length > 0 ? { options } : {}),
      }),
    });

    if (!response.ok) {
      throw new AgentRuntimeError(
        `Ollama API error: ${response.status} ${response.statusText}`,
        "AGENT_MODEL_PROVIDER_ERROR",
        "Ollama model request failed",
        502,
      );
    }

    return response.json() as Promise<OllamaChatResponse>;
  }
}

function resolveThink(input: AgentModelInvokeInput): boolean | string {
  if (input.thinkingEnabled !== true) {
    return false;
  }

  const requestedThink = input.thinkingRequest?.think;
  return typeof requestedThink === "string" || typeof requestedThink === "boolean"
    ? requestedThink
    : true;
}

function buildOllamaOptions(input: AgentModelInvokeInput): Record<string, any> {
  return {
    ...(input.ollamaOptions ?? {}),
    ...definedNumberOption("temperature", input.temperature),
    ...definedNumberOption("num_predict", input.maxTokens),
    ...definedNumberOption("num_ctx", input.numCtx),
    ...definedNumberOption("top_p", input.topP),
    ...definedNumberOption("top_k", input.topK),
    ...definedNumberOption("repeat_penalty", input.repeatPenalty),
    ...definedNumberOption("seed", input.seed),
  };
}

function definedNumberOption(key: string, value: unknown): Record<string, number> {
  if (value === undefined || value === null || value === "") {
    return {};
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? { [key]: numericValue } : {};
}

export function normalizeOllamaHost(baseUrl: string | undefined): string {
  const host = baseUrl?.trim() || "http://localhost:11434";
  return host.replace(/\/+(api|v1)?\/?$/, "");
}

export function toOllamaMessage(message: AgentModelMessage): Record<string, unknown> {
  if (message.role === "assistant" && message.tool_calls?.length) {
    return {
      role: "assistant",
      content: message.content,
      tool_calls: message.tool_calls.map((call) => ({
        function: {
          name: call.name,
          arguments: call.arguments,
        },
      })),
    };
  }
  if (message.role === "tool" && message.tool_call_id) {
    return {
      role: "tool",
      content: message.content,
      ...(message.name ? { tool_name: message.name } : {}),
    };
  }
  return {
    role: message.role,
    content: message.content,
  };
}

function ollamaHeaders(credentials: Record<string, string> | undefined): Record<string, string> {
  const apiKey = credentials?.api_key ?? credentials?.apiKey ?? credentials?.token;
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

function extractOllamaText(body: OllamaChatResponse): string {
  const content = body.message?.content ?? body.response;
  return typeof content === "string" ? content : "";
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim() || "Unknown error";
}
