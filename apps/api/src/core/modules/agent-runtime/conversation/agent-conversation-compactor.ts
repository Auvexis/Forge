import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import { canonicalizeToolHistory } from "../loop/canonical-agent-scratchpad.ts";

const OMISSION_MESSAGE = "Earlier conversation messages were omitted to fit the model context.";
const MIN_CONVERSATION_BUDGET_CHARS = 4_000;
const MAX_CONVERSATION_BUDGET_CHARS = 32_000;
const DEFAULT_MODEL_CONTEXT_TOKENS = 8_192;

export function conversationBudgetChars(numCtx?: number): number {
  const contextTokens = Number.isFinite(numCtx) && numCtx! > 0
    ? Math.floor(numCtx!)
    : DEFAULT_MODEL_CONTEXT_TOKENS;
  return Math.max(
    MIN_CONVERSATION_BUDGET_CHARS,
    Math.min(MAX_CONVERSATION_BUDGET_CHARS, Math.floor(contextTokens * 1.5)),
  );
}

export function compactAgentConversation(
  messages: AgentModelMessage[],
  maxChars: number,
): AgentModelMessage[] {
  if (messages.length === 0 || maxChars <= 0) return [];
  const units = conversationUnits(canonicalizeToolHistory(messages));
  const selected: AgentModelMessage[][] = [];
  let size = 0;

  for (let index = units.length - 1; index >= 0; index -= 1) {
    const unit = units[index]!;
    const unitSize = serializedSize(unit);
    if (size + unitSize > maxChars) continue;
    selected.unshift(unit);
    size += unitSize;
  }

  const omitted = selected.length < units.length;
  if (!omitted) return selected.flat();

  const marker: AgentModelMessage = { role: "system", content: OMISSION_MESSAGE };
  while (selected.length > 0 && size + serializedSize(marker) > maxChars) {
    size -= serializedSize(selected.shift()!);
  }
  if (serializedSize(marker) > maxChars) return selected.flat();
  return [marker, ...selected.flat()];
}

export function compactAgentConversationByTokens(
  messages: AgentModelMessage[],
  input: {
    contextWindowTokens?: number;
    reservedOutputTokens?: number;
  } = {},
): AgentModelMessage[] {
  const contextWindowTokens = finiteInteger(input.contextWindowTokens, DEFAULT_MODEL_CONTEXT_TOKENS);
  const reservedOutputTokens = Math.min(
    finiteInteger(input.reservedOutputTokens, Math.ceil(contextWindowTokens * 0.2)),
    Math.max(256, contextWindowTokens - 512),
  );
  const inputBudget = Math.max(512, contextWindowTokens - reservedOutputTokens);
  const canonical = canonicalizeToolHistory(messages);
  const units = conversationUnits(canonical);
  const selected: AgentModelMessage[][] = [];
  let used = 0;
  for (let index = units.length - 1; index >= 0; index -= 1) {
    const unit = units[index]!;
    const tokens = estimatedTokens(unit);
    if (selected.length > 0 && used + tokens > inputBudget) continue;
    selected.unshift(unit);
    used += tokens;
  }
  if (selected.length === units.length) return selected.flat();
  const marker: AgentModelMessage = { role: "system", content: OMISSION_MESSAGE };
  while (
    selected.length > 0 &&
    used + estimatedTokens([marker]) > inputBudget
  ) {
    used -= estimatedTokens(selected.shift()!);
  }
  return [marker, ...selected.flat()];
}

function conversationUnits(messages: AgentModelMessage[]): AgentModelMessage[][] {
  const units: AgentModelMessage[][] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]!;
    if (message.role !== "assistant" || !message.tool_calls?.length) {
      if (message.role !== "tool" || !message.tool_call_id) units.push([message]);
      continue;
    }

    const expectedIds = new Set(message.tool_calls.map((call) => call.id));
    const unit = [message];
    while (index + 1 < messages.length) {
      const candidate = messages[index + 1]!;
      if (
        candidate.role !== "tool" ||
        !candidate.tool_call_id ||
        !expectedIds.has(candidate.tool_call_id)
      ) break;
      unit.push(candidate);
      index += 1;
    }
    units.push(unit);
  }
  return units;
}

function serializedSize(value: unknown): number {
  return JSON.stringify(value).length;
}

function estimatedTokens(messages: AgentModelMessage[]): number {
  return messages.reduce((total, message) => {
    const structuralOverhead = 8 + (message.tool_calls?.length ?? 0) * 12;
    return total + structuralOverhead + Math.ceil(JSON.stringify(message).length / 4);
  }, 0);
}

function finiteInteger(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value! > 0 ? Math.floor(value!) : fallback;
}
