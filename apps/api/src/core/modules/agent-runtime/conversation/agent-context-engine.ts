import { createHash } from "node:crypto";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import type {
  AgentMessageWithParts,
  AgentSessionSnapshot,
} from "../session/agent-session-contracts.ts";
import { sanitizeAgentToolValue } from "../loop/agent-tool-result-sanitizer.ts";

export interface AgentContextProjection {
  messages: AgentModelMessage[];
  prefixHash: string;
  estimatedChars: number;
  compactedTurnCount: number;
}

export interface AgentContextOptions {
  contextWindowTokens?: number;
  reservedOutputTokens?: number;
  maxToolResultChars?: number;
}

export class AgentContextEngine {
  private static readonly cache = new Map<string, AgentContextProjection>();
  private static readonly maxCacheEntries = 128;

  build(
    snapshot: AgentSessionSnapshot,
    options: AgentContextOptions = {},
  ): AgentContextProjection {
    const budget = contextBudgetChars(options);
    const maxToolResultChars = Math.min(
      Math.max(options.maxToolResultChars ?? 8_000, 256),
      64_000,
    );
    const cacheKey = [
      snapshot.session.id,
      snapshot.revision,
      budget,
      maxToolResultChars,
    ].join(":");
    const cached = AgentContextEngine.cache.get(cacheKey);
    if (cached) {
      AgentContextEngine.cache.delete(cacheKey);
      AgentContextEngine.cache.set(cacheKey, cached);
      return structuredClone(cached);
    }

    const turns = groupByTurn(snapshot.messages)
      .map((entries) => projectTurn(entries, maxToolResultChars));
    const retained: AgentModelMessage[][] = [];
    const compacted: AgentModelMessage[][] = [];
    let used = 0;
    for (let index = turns.length - 1; index >= 0; index -= 1) {
      const turn = turns[index]!;
      const size = encodedChars(turn);
      if (retained.length === 0 || used + size <= budget) {
        retained.unshift(turn);
        used += size;
      } else {
        compacted.unshift(turn);
      }
    }
    const summary = compacted.length > 0
      ? [summarizeTurns(compacted)]
      : [];
    const messages = [...summary, ...retained.flat()];
    const projection: AgentContextProjection = {
      messages,
      prefixHash: createHash("sha256")
        .update(JSON.stringify(summary.length > 0 ? summary : messages.slice(0, -1)))
        .digest("hex"),
      estimatedChars: encodedChars(messages),
      compactedTurnCount: compacted.length,
    };
    AgentContextEngine.cache.set(cacheKey, projection);
    while (AgentContextEngine.cache.size > AgentContextEngine.maxCacheEntries) {
      const oldest = AgentContextEngine.cache.keys().next().value;
      if (typeof oldest !== "string") break;
      AgentContextEngine.cache.delete(oldest);
    }
    return structuredClone(projection);
  }
}

export function contextBudgetChars(options: AgentContextOptions): number {
  const windowTokens = Math.min(Math.max(options.contextWindowTokens ?? 8_192, 1_024), 2_000_000);
  const reserved = Math.min(
    Math.max(options.reservedOutputTokens ?? Math.ceil(windowTokens * 0.2), 256),
    Math.max(256, windowTokens - 512),
  );
  return Math.max(2_048, (windowTokens - reserved) * 4);
}

function groupByTurn(messages: AgentMessageWithParts[]): AgentMessageWithParts[][] {
  const groups = new Map<string, AgentMessageWithParts[]>();
  for (const message of messages) {
    const list = groups.get(message.message.turnId) ?? [];
    list.push(message);
    groups.set(message.message.turnId, list);
  }
  return [...groups.values()].sort((left, right) =>
    (left[0]?.message.sequence ?? 0) - (right[0]?.message.sequence ?? 0)
  );
}

function projectTurn(
  entries: AgentMessageWithParts[],
  maxToolResultChars: number,
): AgentModelMessage[] {
  return entries.flatMap(({ message, parts }) => {
    const text = parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
    const tools = parts.filter((part) => part.type === "tool");
    const calls = tools.map((part) => ({
      id: part.callId,
      name: part.toolName,
      arguments: isRecord(part.state.input) ? part.state.input : {},
    }));
    const primary: AgentModelMessage[] = text || calls.length > 0
      ? [{
          role: message.role,
          content: text,
          ...(calls.length > 0 ? { tool_calls: calls } : {}),
        }]
      : [];
    const results: AgentModelMessage[] = tools.flatMap((part) => {
      if (part.state.status !== "completed" && part.state.status !== "error") return [];
      const value = part.state.status === "completed"
        ? part.state.output
        : { error: part.state.error };
      return [{
        role: "tool",
        name: part.toolName,
        tool_call_id: part.callId,
        content: boundedToolResult(value, maxToolResultChars),
      }];
    });
    return [...primary, ...results];
  });
}

function boundedToolResult(value: unknown, limit: number): string {
  const encoded = JSON.stringify(sanitizeAgentToolValue(value));
  if (encoded.length <= limit) return encoded;
  const artifactRefs = [...encoded.matchAll(/artifact:\/\/[a-zA-Z0-9._:-]+/g)]
    .map((match) => match[0]);
  return JSON.stringify({
    preview: encoded.slice(0, limit),
    truncated: true,
    artifactRefs: [...new Set(artifactRefs)],
  });
}

function summarizeTurns(turns: AgentModelMessage[][]): AgentModelMessage {
  const summaries = turns.map((turn, index) => {
    const user = turn.find((message) => message.role === "user")?.content ?? "";
    const tools = turn
      .flatMap((message) => message.tool_calls ?? [])
      .map((call) => call.name);
    const assistant = [...turn].reverse()
      .find((message) => message.role === "assistant" && message.content)?.content ?? "";
    return {
      turn: index + 1,
      user: truncate(user, 500),
      tools,
      assistant: truncate(assistant, 500),
    };
  });
  return {
    role: "system",
    content: `Deterministic summary of earlier completed turns:\n${JSON.stringify(summaries)}`,
  };
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit)}…`;
}

function encodedChars(messages: AgentModelMessage[]): number {
  return JSON.stringify(messages).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
