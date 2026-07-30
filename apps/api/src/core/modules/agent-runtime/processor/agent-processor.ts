import { normalizeInternalMcpError } from "../mcp/internal-mcp-error.ts";
import { AdaptiveMcpToolset } from "../mcp/adaptive-mcp-toolset.ts";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import type { AgentToolPart } from "../session/agent-session-contracts.ts";
import type { AgentSessionWriter } from "../session/agent-session-writer.ts";
import {
  collectAgentResponse,
  type AgentProcessorRequest,
  type AgentStreamingModel,
} from "./agent-response-stream.ts";

export interface AgentProcessorResult {
  status: "completed";
  output: string;
  iterations: number;
  toolCallCount: number;
  toolCalls: Array<{
    toolCallId: string;
    name: string;
    status: "success";
  }>;
}

export async function runAgentProcessor(input: {
  model: AgentStreamingModel;
  client: InternalMcpClient;
  messages: AgentProcessorRequest["messages"];
  systemPrompt: string;
  maxIterations: number;
  maxToolCalls: number;
  maxConcurrentReads?: number;
  abortSignal?: AbortSignal;
  writer?: AgentSessionWriter;
  turnId?: string;
}): Promise<AgentProcessorResult> {
  const messages: AgentProcessorRequest["messages"] = [
    { role: "system", content: processorSystemPrompt(input.systemPrompt) },
    ...input.messages,
  ];
  const toolset = new AdaptiveMcpToolset(input.client);
  let toolCallCount = 0;
  const completedToolCalls: AgentProcessorResult["toolCalls"] = [];
  let finalText = "";

  for (let iteration = 1; iteration <= input.maxIterations; iteration += 1) {
    throwIfAborted(input.abortSignal);
    const response = await collectAgentResponse(input.model.stream({
      messages,
      tools: toolset.listForModel(),
      abortSignal: input.abortSignal,
    }));
    const assistantMessage = input.writer && input.turnId
      ? input.writer.appendMessage(input.turnId, "assistant")
      : undefined;
    if (response.text) {
      finalText = response.text;
      if (assistantMessage && input.writer) {
        input.writer.appendText({
          turnId: input.turnId!,
          messageId: assistantMessage.id,
          text: response.text,
        });
      }
    }

    if (response.toolCalls.length === 0) {
      if (response.finishReason === "length") {
        throw new Error("Agent model reached its output limit before completing the turn");
      }
      if (input.writer && input.turnId) input.writer.updateTurn(input.turnId, "completed");
      return {
        status: "completed",
        output: finalText,
        iterations: iteration,
        toolCallCount,
        toolCalls: completedToolCalls,
      };
    }
    if (toolCallCount + response.toolCalls.length > input.maxToolCalls) {
      throw new Error("Agent tool call limit exceeded");
    }

    messages.push({
      role: "assistant",
      content: response.text,
      toolCalls: response.toolCalls.map((call) => ({
        callId: call.callId,
        name: call.toolName,
        input: call.input,
      })),
    });

    const prepared = response.toolCalls.map((call) => {
      let part: AgentToolPart | undefined;
      if (assistantMessage && input.writer) {
        part = input.writer.appendTool({
          turnId: input.turnId!,
          messageId: assistantMessage.id,
          callId: call.callId,
          toolName: call.toolName,
          arguments: call.input,
        });
        part = input.writer.startTool(part, call.input);
      }
      return { call, part };
    });
    const results = await executeToolCalls({
      calls: prepared,
      toolset,
      writer: input.writer,
      maxConcurrentReads: input.maxConcurrentReads ?? 4,
      abortSignal: input.abortSignal,
    });
    for (const result of results) {
      messages.push({
        role: "tool",
        content: JSON.stringify(result.content),
        toolCallId: result.callId,
      });
      toolCallCount += 1;
      completedToolCalls.push({
        toolCallId: result.callId,
        name: result.toolName,
        status: "success",
      });
    }
  }

  throw new Error("Agent iteration limit exceeded before completing the turn");
}

async function executeToolCalls(input: {
  calls: Array<{
    call: {
      callId: string;
      toolName: string;
      input: Record<string, unknown>;
    };
    part?: AgentToolPart;
  }>;
  toolset: AdaptiveMcpToolset;
  writer?: AgentSessionWriter;
  maxConcurrentReads: number;
  abortSignal?: AbortSignal;
}): Promise<Array<{ callId: string; toolName: string; content: unknown }>> {
  const output = new Map<string, unknown>();
  let readWave: typeof input.calls = [];
  const flushReads = async () => {
    if (readWave.length === 0) return;
    const wave = readWave;
    readWave = [];
    const results = await mapConcurrent(wave, input.maxConcurrentReads, (call) =>
      executeToolCall({ ...input, prepared: call }));
    results.forEach((result) => output.set(result.callId, result.content));
  };

  for (const prepared of input.calls) {
    const descriptor = input.toolset.describe(prepared.call.toolName);
    if (descriptor.sideEffect === "read" && !descriptor.requiresApproval) {
      readWave.push(prepared);
      continue;
    }
    await flushReads();
    const result = await executeToolCall({ ...input, prepared });
    output.set(result.callId, result.content);
  }
  await flushReads();
  return input.calls.map(({ call }) => ({
    callId: call.callId,
    toolName: call.toolName,
    content: output.get(call.callId),
  }));
}

async function executeToolCall(input: {
  prepared: {
    call: {
      callId: string;
      toolName: string;
      input: Record<string, unknown>;
    };
    part?: AgentToolPart;
  };
  toolset: AdaptiveMcpToolset;
  writer?: AgentSessionWriter;
  abortSignal?: AbortSignal;
}): Promise<{ callId: string; toolName: string; content: unknown }> {
  const { call } = input.prepared;
  throwIfAborted(input.abortSignal);
  try {
    const result = await input.toolset.call({
      id: call.callId,
      actionId: `action_${call.callId}`,
      name: call.toolName,
      arguments: call.input,
    });
    if (input.prepared.part && input.writer) {
      input.writer.completeTool(input.prepared.part, result.content);
    }
    return { callId: call.callId, toolName: call.toolName, content: result.content };
  } catch (error) {
    if (input.prepared.part && input.writer) {
      input.writer.failTool(
        input.prepared.part,
        normalizeInternalMcpError(error, call.toolName),
      );
    }
    throw error;
  }
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await mapper(items[index]!);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function processorSystemPrompt(systemPrompt: string): string {
  return [
    systemPrompt,
    "Respond naturally when no external action is required.",
    "Call connected tools when the user requests an external action.",
    "After tool results, continue until the user's request is fully handled.",
    "Never claim an operation succeeded without a corresponding successful tool result.",
    "Ask a concise question instead of guessing missing identifiers, recipients, files, permissions, or destructive intent.",
  ].filter(Boolean).join("\n\n");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new Error("Agent processor was cancelled");
}
