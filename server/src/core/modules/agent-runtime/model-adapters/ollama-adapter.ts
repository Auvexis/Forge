import { AgentRuntimeError } from "../agent-errors.ts";
import type {
  AgentModelAdapter,
  AgentModelInvokeInput,
  AgentModelMessage,
} from "./agent-model-adapter.ts";
import type { AgentPlan, AgentStepRepair } from "../plan/agent-plan-types.ts";

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
    this.keepAlive = options.keepAlive ?? process.env.SAILOR_OLLAMA_KEEP_ALIVE;
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

  generatePlan(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<AgentPlan> {
    return this.invokeJson<AgentPlan>(input, schema);
  }

  repairPlanStep(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<AgentStepRepair> {
    return this.invokeJson<AgentStepRepair>(input, schema);
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
    generatePlan(
      planInput: { messages: AgentModelMessage[] },
      schema?: Record<string, any>,
      options?: { signal?: AbortSignal },
    ): Promise<AgentPlan>;
    repairPlanStep(
      repairInput: { messages: AgentModelMessage[] },
      schema?: Record<string, any>,
      options?: { signal?: AbortSignal },
    ): Promise<AgentStepRepair>;
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
      generatePlan: async (planInput, schema, options) =>
        this.generatePlan({ ...input, messages: planInput.messages, abortSignal: options?.signal ?? input.abortSignal }, schema),
      repairPlanStep: async (repairInput, schema, options) =>
        this.repairPlanStep({ ...input, messages: repairInput.messages, abortSignal: options?.signal ?? input.abortSignal }, schema),
      generateFinalResponse: async (finalInput, options) =>
        this.generateFinalResponse({ ...input, messages: finalInput.messages, abortSignal: options?.signal ?? input.abortSignal }),
    };
  }

  private async chat(input: AgentModelInvokeInput, format?: "json" | Record<string, any>): Promise<OllamaChatResponse> {
    const response = await this.fetch(`${normalizeOllamaHost(input.baseUrl)}/api/chat`, {
      method: "POST",
      headers: ollamaHeaders(input.credentials),
      signal: input.abortSignal,
      body: JSON.stringify({
        model: input.model,
        messages: input.messages.map(toOllamaMessage),
        stream: false,
        think: input.thinkingEnabled === true,
        ...(this.keepAlive !== undefined ? { keep_alive: this.keepAlive } : {}),
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
