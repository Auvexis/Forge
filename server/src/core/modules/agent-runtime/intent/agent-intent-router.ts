import type { AgentToolSideEffect } from "../agent-types.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";

export type AgentIntentMode = "chat" | "tool_plan";

export interface AgentIntentDecision {
  mode: AgentIntentMode;
  reason: string;
  confidence: number;
  answer?: string;
}

export interface AgentIntentTool {
  name: string;
  description: string;
  instructions?: string;
  sideEffect?: AgentToolSideEffect;
}

export interface AgentIntentModel {
  routeIntent(input: {
    messages: AgentModelMessage[];
    schema: Record<string, any>;
    signal?: AbortSignal;
  }): Promise<unknown>;
}

export interface RouteAgentIntentInput {
  model: AgentIntentModel;
  userMessage: string;
  contextMessages: AgentModelMessage[];
  tools: AgentIntentTool[];
  timeoutMs?: number;
}

const LOW_CONFIDENCE_THRESHOLD = 0.65;
const DEFAULT_INTENT_TIMEOUT_MS = 700;

export async function routeAgentIntent(input: RouteAgentIntentInput): Promise<AgentIntentDecision> {
  const abortController = new AbortController();
  const timeoutMs = input.timeoutMs ?? DEFAULT_INTENT_TIMEOUT_MS;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const rawDecision = await Promise.race([
      input.model.routeIntent({
        messages: [
          { role: "system", content: buildIntentPrompt(input.tools) },
          ...compactContext(input.contextMessages),
          { role: "user", content: input.userMessage },
        ],
        schema: agentIntentJsonSchema(),
        signal: abortController.signal,
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          abortController.abort();
          reject(new Error("Intent routing timed out"));
        }, timeoutMs);
      }),
    ]);
    return normalizeIntentDecision(rawDecision, input.userMessage);
  } catch {
    return fallbackChatDecision(input.userMessage);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function buildIntentPrompt(tools: AgentIntentTool[]): string {
  const catalog = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    instructions: truncate(tool.instructions ?? tool.description, 240),
    sideEffect: tool.sideEffect,
  }));

  return [
    "Classify the user message as chat or tool_plan.",
    "Return strict JSON with mode, reason, confidence, and optional answer.",
    "Use chat for greetings, questions, explanations, or tool catalog questions.",
    "Use tool_plan only when the user asks to read, create, update, send, delete, download, upload, or otherwise operate with a tool.",
    "If unsure, choose chat.",
    JSON.stringify({ tools: catalog }),
  ].join("\n");
}

function compactContext(messages: AgentModelMessage[]): AgentModelMessage[] {
  return messages.slice(-2).map((message) => ({
    ...message,
    content: truncate(message.content, 320),
  }));
}

function truncate(value: string, maxChars: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars)}...` : trimmed;
}

function normalizeIntentDecision(rawDecision: unknown, userMessage: string): AgentIntentDecision {
  if (!rawDecision || typeof rawDecision !== "object" || Array.isArray(rawDecision)) {
    return fallbackChatDecision(userMessage);
  }

  const record = rawDecision as Record<string, unknown>;
  const mode = record.mode === "tool_plan" ? "tool_plan" : record.mode === "chat" ? "chat" : null;
  const confidence = typeof record.confidence === "number" && Number.isFinite(record.confidence)
    ? Math.max(0, Math.min(1, record.confidence))
    : 0;
  const reason = typeof record.reason === "string" && record.reason.trim()
    ? record.reason.trim()
    : "Intent router returned an incomplete decision.";
  const answer = typeof record.answer === "string" && record.answer.trim()
    ? record.answer.trim()
    : undefined;

  if (!mode) return fallbackChatDecision(userMessage);
  if (confidence < LOW_CONFIDENCE_THRESHOLD) {
    return {
      mode: "chat",
      reason: `Low confidence intent fallback: ${reason}`,
      confidence,
    };
  }

  return { mode, reason, confidence, answer };
}

function fallbackChatDecision(userMessage: string): AgentIntentDecision {
  const answer = fallbackChatAnswer(userMessage);
  return {
    mode: "chat",
    reason: "Intent routing fallback.",
    confidence: 0,
    ...(answer ? { answer } : {}),
  };
}

function fallbackChatAnswer(userMessage: string): string {
  return userMessage.trim() ? "" : "How can I help?";
}

function agentIntentJsonSchema(): Record<string, any> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["mode", "reason", "confidence"],
    properties: {
      mode: { type: "string", enum: ["chat", "tool_plan"] },
      reason: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      answer: { type: "string" },
    },
  };
}
