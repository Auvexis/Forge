import { AgentRuntimeError } from "../agent-errors.ts";
import type {
  AgentModelAdapter,
  AgentModelInvokeInput,
  AgentModelMessage,
} from "./agent-model-adapter.ts";

export type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export interface OpenAiAdapterOptions {
  fetch?: FetchLike;
}

interface OpenAiResponseBody {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      text?: unknown;
      type?: unknown;
    }>;
  }>;
}

export interface RuntimeChatModel {
  invoke(messages: AgentModelMessage[], options?: { signal?: AbortSignal }): Promise<{ content: string }>;
  invokeJson<T extends object>(
    input: { messages: AgentModelMessage[] },
    schema?: Record<string, any>,
    options?: { signal?: AbortSignal },
  ): Promise<T>;
  generateFinalResponse(
    input: { messages: AgentModelMessage[] },
    options?: { signal?: AbortSignal },
  ): Promise<string>;
}

export class OpenAiAdapter implements AgentModelAdapter {
  private readonly fetch: FetchLike;

  constructor(options: OpenAiAdapterOptions = {}) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async invokeText(input: AgentModelInvokeInput): Promise<string> {
    const body = await this.createResponse(input);
    return extractOpenAiText(body);
  }

  async invokeJson<T extends object>(
    input: AgentModelInvokeInput,
    schema?: Record<string, any>,
  ): Promise<T> {
    const body = await this.createResponse(input, schema ?? "json");
    const text = extractOpenAiText(body).trim();
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected a JSON object");
      }
      return parsed as T;
    } catch (error) {
      throw new AgentRuntimeError(
        `OpenAI returned invalid JSON: ${safeErrorMessage(error)}`,
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
      invoke: async (messages, options) => ({
        content: await this.invokeText({
          ...input,
          messages,
          abortSignal: options?.signal ?? input.abortSignal,
        }),
      }),
      invokeJson: async (jsonInput, schema, options) =>
        this.invokeJson({
          ...input,
          messages: jsonInput.messages,
          abortSignal: options?.signal ?? input.abortSignal,
        }, schema),
      generateFinalResponse: async (finalInput, options) =>
        this.generateFinalResponse({
          ...input,
          messages: finalInput.messages,
          abortSignal: options?.signal ?? input.abortSignal,
        }),
    };
  }

  private async createResponse(
    input: AgentModelInvokeInput,
    format?: "json" | Record<string, any>,
  ): Promise<OpenAiResponseBody> {
    const apiKey = input.credentials?.api_key ?? input.credentials?.apiKey ?? input.credentials?.token;
    if (!apiKey) {
      throw new AgentRuntimeError(
        "Missing OpenAI model credentials",
        "AGENT_MODEL_CREDENTIAL_MISSING",
        "Model credentials are missing",
        400,
      );
    }

    const response = await this.fetch(`${normalizeOpenAiBaseUrl(input.baseUrl)}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: input.abortSignal,
      body: JSON.stringify(createResponseBody(input, format)),
    });

    if (!response.ok) {
      throw new AgentRuntimeError(
        `OpenAI API error: ${response.status} ${response.statusText}`,
        "AGENT_MODEL_PROVIDER_ERROR",
        "OpenAI model request failed",
        502,
      );
    }

    return response.json() as Promise<OpenAiResponseBody>;
  }
}

export function normalizeOpenAiBaseUrl(baseUrl: string | undefined): string {
  const host = baseUrl?.trim() || "https://api.openai.com/v1";
  return host.replace(/\/+responses\/?$/, "").replace(/\/+$/, "");
}

function createResponseBody(
  input: AgentModelInvokeInput,
  format?: "json" | Record<string, any>,
): Record<string, any> {
  const normalizedMessages = normalizeMessages(input.messages);
  const body: Record<string, any> = {
    model: input.model,
    input: normalizedMessages.input,
  };
  if (normalizedMessages.instructions) {
    body.instructions = normalizedMessages.instructions;
  }

  const temperature = normalizeTemperature(input.model, input.temperature);
  if (temperature !== undefined) {
    body.temperature = temperature;
  }
  if (input.maxTokens !== undefined) {
    body.max_output_tokens = input.maxTokens;
  }

  const text: Record<string, any> = {};
  if (format) {
    text.format = toOpenAiTextFormat(format);
  }
  if (usesLowLatencyReasoningDefaults(input.model)) {
    body.reasoning = { effort: "minimal" };
    text.verbosity = "low";
  }
  if (Object.keys(text).length > 0) {
    body.text = text;
  }

  return body;
}

function normalizeMessages(messages: AgentModelMessage[]): {
  instructions?: string;
  input: Array<Record<string, unknown>>;
} {
  const instructions = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    ...(instructions ? { instructions } : {}),
    input: messages
      .filter((message) => message.role !== "system")
      .flatMap(toOpenAiInputItems),
  };
}

export function toOpenAiInputItems(message: AgentModelMessage): Array<Record<string, unknown>> {
  if (message.role === "assistant" && message.tool_calls?.length) {
    return [
      ...(message.content.trim()
        ? [{ role: "assistant", content: message.content }]
        : []),
      ...message.tool_calls.map((call) => ({
        type: "function_call",
        call_id: call.id,
        name: call.name,
        arguments: JSON.stringify(call.arguments),
      })),
    ];
  }
  if (message.role === "tool" && message.tool_call_id) {
    return [{
      type: "function_call_output",
      call_id: message.tool_call_id,
      output: message.content,
    }];
  }
  if (message.role === "tool") {
    const name = message.name?.trim();
    return [{
      role: "user",
      content: name
        ? `Tool result from ${name}:\n${message.content}`
        : `Tool result:\n${message.content}`,
    }];
  }

  return [{
    role: message.role,
    content: message.content,
  }];
}

function toOpenAiTextFormat(format: "json" | Record<string, any>): Record<string, any> {
  if (format === "json") {
    return { type: "json_object" };
  }
  return {
    type: "json_schema",
    name: "agent_json",
    schema: format,
    strict: false,
  };
}

function normalizeTemperature(model: string, value: number | undefined): number | undefined {
  if (value === undefined || usesDefaultTemperatureOnly(model)) return undefined;
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
}

function usesDefaultTemperatureOnly(model: string): boolean {
  const normalized = model.toLowerCase();
  return /(^|[/:])gpt-5(?:-|$)/.test(normalized);
}

function usesLowLatencyReasoningDefaults(model: string): boolean {
  const normalized = model.toLowerCase();
  return /(^|[/:])gpt-5-nano(?:-|$)/.test(normalized);
}

function extractOpenAiText(body: OpenAiResponseBody): string {
  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  const parts: string[] = [];
  for (const item of body.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("");
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim() || "Unknown error";
}
