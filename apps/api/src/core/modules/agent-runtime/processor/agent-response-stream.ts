export interface AgentProcessorTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AgentProcessorRequest {
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    toolCalls?: Array<{
      callId: string;
      name: string;
      input: Record<string, unknown>;
    }>;
    toolCallId?: string;
  }>;
  tools: AgentProcessorTool[];
  abortSignal?: AbortSignal;
}

export type AgentResponseStreamEvent =
  | { type: "response-start"; responseId: string }
  | { type: "text-start"; partId: string }
  | { type: "text-delta"; partId: string; delta: string }
  | { type: "text-end"; partId: string }
  | { type: "tool-input-start"; callId: string; toolName: string }
  | { type: "tool-input-delta"; callId: string; delta: string }
  | {
      type: "tool-call";
      callId: string;
      toolName: string;
      input: Record<string, unknown>;
      providerExecuted?: boolean;
    }
  | {
      type: "tool-result";
      callId: string;
      toolName: string;
      output: unknown;
      providerExecuted?: boolean;
    }
  | {
      type: "tool-error";
      callId: string;
      toolName: string;
      error: {
        code: string;
        message: string;
        retryable: boolean;
      };
      providerExecuted?: boolean;
    }
  | {
      type: "response-end";
      responseId: string;
      finishReason: "stop" | "tool-calls" | "length" | "cancelled" | "error";
      usage?: AgentResponseUsage;
    };

export interface AgentResponseUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}

export interface AgentStreamingModel {
  stream(input: AgentProcessorRequest): AsyncIterable<AgentResponseStreamEvent>;
}

export interface AgentCollectedResponse {
  responseId: string;
  text: string;
  toolCalls: Array<{
    callId: string;
    toolName: string;
    input: Record<string, unknown>;
    providerExecuted: boolean;
  }>;
  finishReason: Extract<AgentResponseStreamEvent, { type: "response-end" }>["finishReason"];
  usage?: AgentResponseUsage;
}

export async function collectAgentResponse(
  events: AsyncIterable<AgentResponseStreamEvent>,
): Promise<AgentCollectedResponse> {
  let responseId = "";
  let text = "";
  let finishReason: AgentCollectedResponse["finishReason"] | undefined;
  let usage: AgentResponseUsage | undefined;
  const textParts = new Map<string, string>();
  const calls = new Map<string, AgentCollectedResponse["toolCalls"][number]>();

  for await (const event of events) {
    switch (event.type) {
      case "response-start":
        if (responseId) throw new Error("Agent response stream started more than once");
        responseId = event.responseId;
        break;
      case "text-start":
        if (textParts.has(event.partId)) throw new Error(`Duplicate text part: ${event.partId}`);
        textParts.set(event.partId, "");
        break;
      case "text-delta": {
        const current = textParts.get(event.partId);
        if (current === undefined) throw new Error(`Text delta received before start: ${event.partId}`);
        textParts.set(event.partId, current + event.delta);
        break;
      }
      case "text-end": {
        const current = textParts.get(event.partId);
        if (current === undefined) throw new Error(`Text end received before start: ${event.partId}`);
        text += current;
        textParts.delete(event.partId);
        break;
      }
      case "tool-call":
        if (calls.has(event.callId)) throw new Error(`Duplicate tool call: ${event.callId}`);
        calls.set(event.callId, {
          callId: event.callId,
          toolName: event.toolName,
          input: event.input,
          providerExecuted: event.providerExecuted === true,
        });
        break;
      case "response-end":
        if (finishReason) throw new Error("Agent response stream ended more than once");
        if (event.responseId !== responseId) throw new Error("Agent response identity changed while streaming");
        finishReason = event.finishReason;
        usage = event.usage;
        break;
      case "tool-input-start":
      case "tool-input-delta":
      case "tool-result":
      case "tool-error":
        break;
    }
  }

  if (!responseId || !finishReason) throw new Error("Agent response stream ended incompletely");
  if (textParts.size > 0) throw new Error("Agent response contains unfinished text parts");
  return {
    responseId,
    text,
    toolCalls: [...calls.values()],
    finishReason,
    ...(usage ? { usage } : {}),
  };
}
