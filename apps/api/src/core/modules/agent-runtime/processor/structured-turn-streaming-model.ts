import type { IntentModel } from "../intent/agent-intent-gateway.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import type {
  AgentProcessorRequest,
  AgentResponseStreamEvent,
  AgentStreamingModel,
} from "./agent-response-stream.ts";
import { AgentRuntimeError } from "../agent-errors.ts";
import { AgentProcessorPause } from "./agent-processor-pause.ts";

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
type NormalizedTurn = StructuredTurn | { type: "clarify"; question: string };

export class StructuredTurnStreamingModel implements AgentStreamingModel {
  constructor(private readonly model: IntentModel) {}

  async *stream(input: AgentProcessorRequest): AsyncIterable<AgentResponseStreamEvent> {
    const responseId = `response_${crypto.randomUUID()}`;
    yield { type: "response-start", responseId };
    const schema = turnSchema(input.tools.map((tool) => tool.name));
    const messages = toModelMessages(input);
    let decision: NormalizedTurn | null = null;
    for (let attempt = 0; attempt < 2 && !decision; attempt += 1) {
      decision = normalizeTurn(await this.model.invokeJson<StructuredTurn>({
        signal: input.abortSignal,
        schema,
        messages: attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: "system",
                content: "Your previous response did not match the required schema. Return exactly one valid object with type text or tool-calls.",
              },
            ],
      }));
    }
    if (!decision) {
      throw new AgentRuntimeError(
        "Agent model returned an unsupported structured turn after one repair attempt",
        "AGENT_MODEL_PROTOCOL_INVALID",
        "The model could not produce a valid agent decision",
        502,
      );
    }
    if (decision.type === "clarify") {
      throw new AgentProcessorPause(
        "clarification",
        decision.question,
        "agent",
        {
          code: "AGENT_CLARIFICATION_REQUIRED",
          category: "validation",
          message: decision.question,
          retryable: false,
          userActionRequired: true,
        },
      );
    }
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

function normalizeTurn(value: unknown): NormalizedTurn | null {
  if (!isRecord(value)) return null;
  const record = value;
  if (record?.mode === "chat") {
    const text = String(record.response ?? "").trim();
    return isGenericClarification(text) ? null : { type: "text", text };
  }
  if (record?.mode === "clarify" && String(record.question ?? "").trim()) {
    return { type: "clarify", question: String(record.question).trim() };
  }
  if (record.type === "text" && String(record.text ?? "").trim()) {
    const text = String(record.text).trim();
    return isGenericClarification(text) ? null : { type: "text", text };
  }
  if (record.type === "tool-calls" && Array.isArray(record.calls) && record.calls.length > 0) {
    return {
      type: "tool-calls",
      calls: record.calls.filter(isRecord).map((call, index) => ({
        id: String(call.id || `call_${index + 1}`),
        name: String(call.name ?? ""),
        arguments: isRecord(call.arguments) ? call.arguments : {},
        commitmentIds: Array.isArray(call.commitmentIds)
          ? call.commitmentIds.map(String)
          : [],
      })),
      commitments: Array.isArray(record.commitments)
        ? record.commitments.filter(isRecord).map((item) => ({
            id: String(item.id ?? ""),
            description: String(item.description ?? ""),
          }))
        : [],
    };
  }
  return null;
}

function isGenericClarification(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .trim();
  return normalized === "preciso de mais informacoes para continuar" ||
    normalized === "i need more information to continue";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
