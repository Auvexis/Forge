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
  }): Promise<unknown>;
}

export interface RouteAgentIntentInput {
  model: AgentIntentModel;
  userMessage: string;
  contextMessages: AgentModelMessage[];
  tools: AgentIntentTool[];
}

const LOW_CONFIDENCE_THRESHOLD = 0.65;

export async function routeAgentIntent(input: RouteAgentIntentInput): Promise<AgentIntentDecision> {
  try {
    const rawDecision = await input.model.routeIntent({
      messages: [
        { role: "system", content: buildIntentPrompt(input.tools) },
        ...input.contextMessages.slice(-6),
        { role: "user", content: input.userMessage },
      ],
      schema: agentIntentJsonSchema(),
    });
    return normalizeIntentDecision(rawDecision, input.userMessage);
  } catch {
    return fallbackChatDecision(input.userMessage);
  }
}

function buildIntentPrompt(tools: AgentIntentTool[]): string {
  const catalog = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    instructions: tool.instructions ?? tool.description,
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
      answer: fallbackChatAnswer(userMessage),
    };
  }

  return { mode, reason, confidence, answer };
}

function fallbackChatDecision(userMessage: string): AgentIntentDecision {
  return {
    mode: "chat",
    reason: "Intent routing fallback.",
    confidence: 0,
    answer: fallbackChatAnswer(userMessage),
  };
}

function fallbackChatAnswer(userMessage: string): string {
  const trimmed = userMessage.trim();
  return trimmed ? `I can help with that: ${trimmed}` : "How can I help?";
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
