import { normalizeInternalMcpError } from "../mcp/internal-mcp-error.ts";
import { AdaptiveMcpToolset } from "../mcp/adaptive-mcp-toolset.ts";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import type { AgentCommitmentPart, AgentToolPart } from "../session/agent-session-contracts.ts";
import type { AgentSessionWriter } from "../session/agent-session-writer.ts";
import {
  collectAgentResponse,
  type AgentProcessorRequest,
  type AgentStreamingModel,
} from "./agent-response-stream.ts";
import { TurnCommitmentLedger } from "./turn-commitment-ledger.ts";
import { AgentProcessorPause, pauseKind } from "./agent-processor-pause.ts";
import { AgentToolApprovalRequiredError } from "../agent-errors.ts";

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
  maxRetriesPerTool?: number;
  abortSignal?: AbortSignal;
  writer?: AgentSessionWriter;
  turnId?: string;
  restoredCommitmentPart?: AgentCommitmentPart;
}): Promise<AgentProcessorResult> {
  const messages: AgentProcessorRequest["messages"] = [
    { role: "system", content: processorSystemPrompt(input.systemPrompt) },
    ...input.messages,
  ];
  const toolset = new AdaptiveMcpToolset(input.client);
  let toolCallCount = 0;
  const completedToolCalls: AgentProcessorResult["toolCalls"] = [];
  let commitmentLedger = input.restoredCommitmentPart
    ? new TurnCommitmentLedger(input.restoredCommitmentPart.items)
    : undefined;
  let commitmentPart = input.restoredCommitmentPart;
  if (commitmentLedger && !commitmentLedger.isComplete) {
    messages.push({
      role: "system",
      content: `Resume these pending outcomes: ${JSON.stringify(commitmentLedger.pending)}`,
    });
  }
  let finalText = "";

  for (let iteration = 1; iteration <= input.maxIterations; iteration += 1) {
    throwIfAborted(input.abortSignal);
    const response = await collectAgentResponse(input.model.stream({
      messages,
      tools: toolset.listForModel(),
      abortSignal: input.abortSignal,
    }));
    if (response.commitments.length > 0) {
      if (commitmentLedger) throw new Error("Turn commitments cannot be replaced after execution starts");
      commitmentLedger = new TurnCommitmentLedger(response.commitments);
    }
    if (response.toolCalls.length === 0 && commitmentLedger && !commitmentLedger.isComplete) {
      messages.push({
        role: "system",
        content: [
          "Completion rejected because requested outcomes remain pending.",
          JSON.stringify(commitmentLedger.pending.map((item) => ({
            id: item.id,
            description: item.description,
          }))),
          "Continue with tools or explain what user input is required. Do not claim completion.",
        ].join("\n"),
      });
      continue;
    }
    const assistantMessage = input.writer && input.turnId
      ? input.writer.appendMessage(input.turnId, "assistant")
      : undefined;
    if (
      commitmentLedger &&
      !commitmentPart &&
      assistantMessage &&
      input.writer
    ) {
      commitmentPart = input.writer.appendCommitments({
        turnId: input.turnId!,
        messageId: assistantMessage.id,
        request: latestUserMessage(messages),
        items: commitmentLedger.snapshot,
      });
    }
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
      return { call, part, commitmentIds: call.commitmentIds };
    });
    const results = await executeToolCalls({
      calls: prepared,
      toolset,
      writer: input.writer,
      maxConcurrentReads: input.maxConcurrentReads ?? 4,
      maxRetriesPerTool: input.maxRetriesPerTool ?? 0,
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
      if (commitmentLedger && result.commitmentIds.length > 0) {
        commitmentLedger.recordEvidence(
          result.commitmentIds,
          result.evidencePartId,
        );
        if (commitmentPart && input.writer) {
          commitmentPart = input.writer.updateCommitments(
            commitmentPart,
            commitmentLedger.snapshot,
          );
        }
      }
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
    commitmentIds: string[];
  }>;
  toolset: AdaptiveMcpToolset;
  writer?: AgentSessionWriter;
  maxConcurrentReads: number;
  maxRetriesPerTool: number;
  abortSignal?: AbortSignal;
}): Promise<Array<{
  callId: string;
  toolName: string;
  content: unknown;
  commitmentIds: string[];
  evidencePartId: string;
}>> {
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
    commitmentIds: input.calls.find((candidate) => candidate.call.callId === call.callId)!.commitmentIds,
    evidencePartId: input.calls.find((candidate) => candidate.call.callId === call.callId)!.part?.id ??
      `tool-call:${call.callId}`,
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
    commitmentIds: string[];
  };
  toolset: AdaptiveMcpToolset;
  writer?: AgentSessionWriter;
  abortSignal?: AbortSignal;
  maxRetriesPerTool: number;
}): Promise<{ callId: string; toolName: string; content: unknown }> {
  const { call } = input.prepared;
  throwIfAborted(input.abortSignal);
  const maxRetries = Math.min(Math.max(0, input.maxRetriesPerTool), 3);
  for (let attempt = 0; ; attempt += 1) {
    try {
      const result = await input.toolset.call({
        id: call.callId,
        actionId: `action_${call.callId}`,
        name: call.toolName,
        arguments: call.input,
      });
      if (input.prepared.part && input.writer) {
        input.prepared.part = input.writer.completeTool(input.prepared.part, result.content);
      }
      return { callId: call.callId, toolName: call.toolName, content: result.content };
    } catch (error) {
      const normalized = normalizeInternalMcpError(error, call.toolName);
      if (
        normalized.retryable &&
        !(error instanceof AgentToolApprovalRequiredError) &&
        attempt < maxRetries
      ) {
        await retryDelay(attempt, input.abortSignal);
        if (input.prepared.part && input.writer) {
          input.prepared.part = input.writer.startTool(
            input.prepared.part,
            call.input,
            attempt + 2,
          );
        }
        continue;
      }
      if (input.prepared.part && input.writer) {
        input.writer.failTool(input.prepared.part, normalized);
      }
      if (
        !(error instanceof AgentToolApprovalRequiredError) &&
        normalized.userActionRequired
      ) {
        throw new AgentProcessorPause(
          pauseKind(normalized),
          normalized.message,
          call.toolName,
          normalized,
        );
      }
      throw error;
    }
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
    "For multi-step external requests, declare every requested outcome as a commitment with a stable id.",
    "Attach commitmentIds to the tool calls whose successful results prove each outcome.",
    "Never claim an operation succeeded without a corresponding successful tool result.",
    "Ask a concise question instead of guessing missing identifiers, recipients, files, permissions, or destructive intent.",
  ].filter(Boolean).join("\n\n");
}

function latestUserMessage(messages: AgentProcessorRequest["messages"]): string {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new Error("Agent processor was cancelled");
}

function retryDelay(attempt: number, signal?: AbortSignal): Promise<void> {
  const delayMs = Math.min(1_000, 100 * (2 ** attempt));
  if (signal?.aborted) return Promise.reject(signal.reason ?? new Error("Agent processor was cancelled"));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(signal.reason ?? new Error("Agent processor was cancelled"));
    }, { once: true });
  });
}
