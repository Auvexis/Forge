import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import { sanitizeAgentToolValue } from "./agent-tool-result-sanitizer.ts";

export interface CanonicalScratchpadStep {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  output: unknown;
}

const DEFAULT_RESULT_LIMIT = 8_000;
const ARTIFACT_PATTERN = /artifact:\/\/[a-zA-Z0-9._:-]+/g;

export function buildCanonicalScratchpad(
  steps: CanonicalScratchpadStep[],
  maxToolResultChars = DEFAULT_RESULT_LIMIT,
): AgentModelMessage[] {
  return steps.flatMap((step) => [
    {
      role: "assistant",
      content: "",
      tool_calls: [{
        id: step.toolCallId,
        name: step.toolName,
        arguments: step.arguments,
      }],
    },
    {
      role: "tool",
      name: step.toolName,
      tool_call_id: step.toolCallId,
      content: encodeBoundedResult(step.output, maxToolResultChars),
    },
  ]);
}

export function canonicalizeToolHistory(
  messages: AgentModelMessage[],
  maxToolResultChars = DEFAULT_RESULT_LIMIT,
): AgentModelMessage[] {
  const resultByCallId = new Map<string, AgentModelMessage>();
  for (const message of messages) {
    if (message.role !== "tool" || !message.tool_call_id) continue;
    if (!resultByCallId.has(message.tool_call_id)) {
      resultByCallId.set(message.tool_call_id, {
        ...message,
        content: encodeBoundedResult(parseContent(message.content), maxToolResultChars),
      });
    }
  }

  const emittedResults = new Set<string>();
  const output: AgentModelMessage[] = [];
  for (const message of messages) {
    if (message.role === "tool") continue;
    if (message.role !== "assistant" || !message.tool_calls?.length) {
      output.push(message);
      continue;
    }
    const calls = message.tool_calls.filter((call) => resultByCallId.has(call.id));
    if (calls.length === 0) {
      if (message.content) output.push({ role: "assistant", content: message.content });
      continue;
    }
    output.push({ ...message, tool_calls: calls });
    for (const call of calls) {
      if (emittedResults.has(call.id)) continue;
      output.push(resultByCallId.get(call.id)!);
      emittedResults.add(call.id);
    }
  }
  return output;
}

export function reconstructScratchpadSteps(
  messages: AgentModelMessage[],
): CanonicalScratchpadStep[] {
  const canonical = canonicalizeToolHistory(messages);
  const calls = new Map<string, { name: string; arguments: Record<string, unknown> }>();
  const steps: CanonicalScratchpadStep[] = [];
  for (const message of canonical) {
    for (const call of message.tool_calls ?? []) {
      calls.set(call.id, { name: call.name, arguments: call.arguments });
    }
    if (message.role !== "tool" || !message.tool_call_id) continue;
    const call = calls.get(message.tool_call_id);
    if (!call) continue;
    steps.push({
      toolCallId: message.tool_call_id,
      toolName: call.name,
      arguments: call.arguments,
      output: parseContent(message.content),
    });
  }
  return steps;
}

export function conversationWithoutToolHistory(
  messages: AgentModelMessage[],
): AgentModelMessage[] {
  return messages.flatMap((message) => {
    if (message.role === "tool") return [];
    if (!message.tool_calls?.length) return [message];
    return message.content ? [{ role: message.role, content: message.content }] : [];
  });
}

function encodeBoundedResult(value: unknown, limit: number): string {
  const safeLimit = Math.min(Math.max(limit, 256), 64_000);
  const encoded = JSON.stringify(sanitizeAgentToolValue(value));
  if (encoded.length <= safeLimit) return encoded;
  const artifactRefs = [...encoded.matchAll(ARTIFACT_PATTERN)].map((match) => match[0]);
  return JSON.stringify({
    preview: encoded.slice(0, safeLimit),
    truncated: true,
    artifactRefs: [...new Set(artifactRefs)],
  });
}

function parseContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}
