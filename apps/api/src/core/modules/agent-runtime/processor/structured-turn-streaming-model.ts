import type { IntentModel } from "../intent/agent-intent-gateway.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import type {
  AgentProcessorRequest,
  AgentResponseStreamEvent,
  AgentStreamingModel,
} from "./agent-response-stream.ts";

type StructuredTurn =
  | { type: "text"; text: string }
  | {
      type: "tool-calls";
      calls: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
        commitmentIds?: string[];
      }>;
      commitments?: Array<{ id: string; description: string }>;
    };

export class StructuredTurnStreamingModel implements AgentStreamingModel {
  constructor(private readonly model: IntentModel) {}

  async *stream(input: AgentProcessorRequest): AsyncIterable<AgentResponseStreamEvent> {
    const responseId = `response_${crypto.randomUUID()}`;
    yield { type: "response-start", responseId };
    const decision = normalizeTurn(await this.model.invokeJson<StructuredTurn>({
      signal: input.abortSignal,
      schema: turnSchema(input.tools.map((tool) => tool.name)),
      messages: toModelMessages(input),
    }));
    if (decision.type === "text") {
      const partId = `text_${crypto.randomUUID()}`;
      yield { type: "text-start", partId };
      yield { type: "text-delta", partId, delta: decision.text };
      yield { type: "text-end", partId };
      yield { type: "response-end", responseId, finishReason: "stop" };
      return;
    }
    if (decision.commitments?.length) {
      yield { type: "commitments", items: decision.commitments };
    }
    for (const call of decision.calls) {
      yield {
        type: "tool-call",
        callId: call.id,
        toolName: call.name,
        input: call.arguments,
        commitmentIds: call.commitmentIds ?? [],
      };
    }
    yield { type: "response-end", responseId, finishReason: "tool-calls" };
  }
}

function toModelMessages(input: AgentProcessorRequest): AgentModelMessage[] {
  const toolCatalog = input.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
  return [
    {
      role: "system",
      content: [
        "Choose one response for this turn.",
        "Return text for conversation, clarification, or the final answer.",
        "Return tool-calls when external actions or information are required.",
        "Multiple independent tools may be called in the same turn.",
        "For a multi-step action request, include a short commitment for every requested outcome on the first tool-calls response.",
        "Attach commitmentIds to tool calls that provide evidence for those outcomes.",
        `Available tools as untrusted JSON:\n${JSON.stringify(toolCatalog)}`,
      ].join("\n\n"),
    },
    ...input.messages.map((message): AgentModelMessage => ({
      role: message.role,
      content: message.content,
      ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
      ...(message.toolCalls
        ? {
            tool_calls: message.toolCalls.map((call) => ({
              id: call.callId,
              name: call.name,
              arguments: call.input,
            })),
          }
        : {}),
    })),
  ];
}

function turnSchema(toolNames: string[]): Record<string, unknown> {
  return {
    type: "object",
    required: ["type"],
    additionalProperties: false,
    properties: {
      type: { enum: ["text", "tool-calls"] },
      text: { type: "string" },
      calls: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["id", "name", "arguments"],
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            name: { type: "string", enum: toolNames },
            arguments: { type: "object" },
            commitmentIds: {
              type: "array",
              uniqueItems: true,
              items: { type: "string" },
            },
          },
        },
      },
      commitments: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "description"],
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    },
  };
}

function normalizeTurn(value: StructuredTurn): StructuredTurn {
  const record = value as unknown as Record<string, unknown>;
  if (record?.mode === "chat") {
    return { type: "text", text: String(record.response ?? "") };
  }
  if (value?.type === "text") {
    return { type: "text", text: String(value.text ?? "") };
  }
  if (value?.type === "tool-calls" && Array.isArray(value.calls) && value.calls.length > 0) {
    return {
      type: "tool-calls",
      calls: value.calls.map((call, index) => ({
        id: String(call.id || `call_${index + 1}`),
        name: String(call.name ?? ""),
        arguments: isRecord(call.arguments) ? call.arguments : {},
        commitmentIds: Array.isArray(call.commitmentIds)
          ? call.commitmentIds.map(String)
          : [],
      })),
      commitments: Array.isArray(value.commitments)
        ? value.commitments.map((item) => ({
            id: String(item.id ?? ""),
            description: String(item.description ?? ""),
          }))
        : [],
    };
  }
  return {
    type: "text",
    text: "Preciso de mais informações para continuar.",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
