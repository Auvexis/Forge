import { AgentRuntimeError } from "../agent-errors.ts";
import type {
  AgentModelAdapter,
  AgentModelInvokeInput,
  AgentModelMessage,
  AgentToolPlan,
} from "./agent-model-adapter.ts";

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export interface OllamaAdapterOptions {
  fetch?: FetchLike;
}

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
  response?: unknown;
}

export class OllamaAdapter implements AgentModelAdapter {
  private readonly fetch: FetchLike;

  constructor(options: OllamaAdapterOptions = {}) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
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

  invokeToolPlan(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<AgentToolPlan> {
    return this.invokeJson<AgentToolPlan>(input, schema);
  }

  createChatModel(input: Omit<AgentModelInvokeInput, "messages">): {
    invoke(messages: AgentModelMessage[]): Promise<{ content: string }>;
  } {
    return {
      invoke: async (messages) => ({
        content: await this.invokeText({ ...input, messages }),
      }),
    };
  }

  private async chat(input: AgentModelInvokeInput, format?: "json" | Record<string, any>): Promise<OllamaChatResponse> {
    const response = await this.fetch(`${normalizeOllamaHost(input.baseUrl)}/api/chat`, {
      method: "POST",
      headers: ollamaHeaders(input.credentials),
      body: JSON.stringify({
        model: input.model,
        messages: input.messages.map(toOllamaMessage),
        stream: false,
        ...(format ? { format } : {}),
        ...(input.temperature !== undefined ? { options: { temperature: input.temperature } } : {}),
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

export function normalizeOllamaHost(baseUrl: string | undefined): string {
  const host = baseUrl?.trim() || "http://localhost:11434";
  return host.replace(/\/+(api|v1)?\/?$/, "");
}

function toOllamaMessage(message: AgentModelMessage): { role: string; content: string } {
  return {
    role: message.role === "tool" ? "user" : message.role,
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
