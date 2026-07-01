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
    return enforceLocalToolIntent(
      normalizeIntentDecision(rawDecision, input.userMessage),
      input.userMessage,
      input.tools,
    );
  } catch {
    return fallbackIntentDecision(input.userMessage, input.tools);
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
    "Classify the user message as CHAT or TOOL_PLAN.",
    "Return exactly one token: CHAT or TOOL_PLAN.",
    "Use chat for greetings, questions, explanations, or tool catalog questions.",
    "Use tool_plan only when the user asks to read, create, update, send, delete, download, upload, or otherwise operate with a tool.",
    "If unsure, return CHAT.",
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
  if (typeof rawDecision === "string") {
    const plainMode = parsePlainIntentMode(rawDecision);
    if (plainMode) {
      return {
        mode: plainMode,
        reason: "Intent router returned a plain classification.",
        confidence: 0.9,
      };
    }
    return fallbackChatDecision(userMessage);
  }

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

function parsePlainIntentMode(value: string): AgentIntentMode | null {
  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized.includes("tool_plan")) return "tool_plan";
  if (normalized.includes("chat")) return "chat";
  return null;
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

function fallbackIntentDecision(userMessage: string, tools: AgentIntentTool[]): AgentIntentDecision {
  if (tools.length > 0 && shouldFallbackToToolPlan(userMessage)) {
    return {
      mode: "tool_plan",
      reason: "Intent routing fallback selected tool planning for a non-chat request with configured tools.",
      confidence: LOW_CONFIDENCE_THRESHOLD,
    };
  }
  return fallbackChatDecision(userMessage);
}

function enforceLocalToolIntent(
  decision: AgentIntentDecision,
  userMessage: string,
  tools: AgentIntentTool[],
): AgentIntentDecision {
  if (decision.mode === "tool_plan") return decision;
  if (tools.length === 0 || !shouldFallbackToToolPlan(userMessage)) return decision;
  return {
    mode: "tool_plan",
    reason: "Local action detection selected tool planning for a non-chat request with configured tools.",
    confidence: Math.max(decision.confidence, LOW_CONFIDENCE_THRESHOLD),
  };
}

function shouldFallbackToToolPlan(message: string): boolean {
  if (isSimpleConversation(message)) return false;
  return hasActionCue(normalizeMessage(message));
}

function fallbackChatAnswer(userMessage: string): string {
  return userMessage.trim() ? "" : "How can I help?";
}

function isSimpleConversation(message: string): boolean {
  const normalized = normalizeMessage(message);
  if (!normalized) return true;
  const words = normalized.split(" ").filter(Boolean);
  if (words.length > 8) return false;

  return SIMPLE_CHAT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeMessage(message: string): string {
  return message
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasActionCue(normalized: string): boolean {
  return /\b(send|sent|email|mail|download|upload|create|update|delete|remove|move|copy|search|find|list|read|fetch|get|open|share|post|publish|write|save|run|execute|call|use|envie|enviar|manda|mande|mandar|email|baixe|baixar|busque|buscar|procure|procurar|liste|listar|leia|ler|crie|criar|atualize|atualizar|delete|deletar|remova|remover|mova|mover|copie|copiar|salve|salvar|execute|executar|use|usar)\b/.test(normalized);
}

const SIMPLE_CHAT_PATTERNS = [
  /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|hello|hi|hey|hola|bonjour|ciao|hallo)( tudo bem)?$/,
  /^(quem e voce|who are you|whos you|who is you|quien eres|qui es tu|que es tu)$/,
  /^(obrigado|obrigada|valeu|thanks|thank you|gracias|merci)$/,
  /^(sim|nao|ok|okay|beleza|certo|yes|no)$/,
];

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
