import { Ajv } from "ajv";
import { AgentRuntimeError } from "../agent-errors.ts";
import type { AgentRuntimeModel } from "../agent-runtime-model.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";

export type AgentModelFailureClass =
  | "timeout"
  | "rate-limit"
  | "temporary"
  | "protocol"
  | "empty"
  | "permanent"
  | "cancelled";

export interface AgentModelResiliencePolicy {
  primaryAttempts: number;
  fallbackAttempts: number;
}

const DEFAULT_POLICY: AgentModelResiliencePolicy = {
  primaryAttempts: 1,
  fallbackAttempts: 1,
};

export function withAgentModelResilience(
  primary: AgentRuntimeModel,
  fallback: AgentRuntimeModel = primary,
  policy: AgentModelResiliencePolicy = DEFAULT_POLICY,
): AgentRuntimeModel {
  return {
    invokeJson: async <T extends object>(input: {
      messages: AgentModelMessage[];
      schema: Record<string, any>;
      signal?: AbortSignal;
    }) => {
      let lastError: unknown;
      for (let attempt = 0; attempt < policy.primaryAttempts; attempt += 1) {
        try {
          return await invokeValidated<T>(primary, input);
        } catch (error) {
          lastError = error;
          if (!isRetryableModelFailure(error)) throw error;
        }
      }
      for (let attempt = 0; attempt < policy.fallbackAttempts; attempt += 1) {
        try {
          return await invokeValidated<T>(fallback, {
            ...input,
            messages: [
              ...input.messages,
              {
                role: "system",
                content: [
                  "REPAIR: Return exactly one JSON object matching the supplied schema.",
                  "Do not include markdown, prose, plans, or multiple alternatives.",
                  "Choose one next action only.",
                ].join(" "),
              },
            ],
          });
        } catch (error) {
          lastError = error;
          if (!isRetryableModelFailure(error)) throw error;
        }
      }
      throw normalizeExhaustedError(lastError);
    },
    generateFinalResponse: async (input) => {
      try {
        const response = await primary.generateFinalResponse(input);
        if (response.trim()) return response;
        throw emptyModelError();
      } catch (error) {
        if (!isRetryableModelFailure(error)) throw error;
        const response = await fallback.generateFinalResponse({
          ...input,
          messages: [
            ...input.messages,
            { role: "system", content: "Provide one concise final answer. Do not return an empty response." },
          ],
        });
        if (!response.trim()) throw emptyModelError();
        return response;
      }
    },
  };
}

export function classifyModelFailure(error: unknown): AgentModelFailureClass {
  if (error instanceof AgentRuntimeError) {
    if (error.code === "AGENT_MODEL_TIMEOUT") return "timeout";
    if (/RATE_LIMIT/.test(error.code) || error.statusCode === 429) return "rate-limit";
    if (/JSON|PROTOCOL|STRUCTURED|SCHEMA/.test(error.code)) return "protocol";
    if (/EMPTY/.test(error.code)) return "empty";
    if (error.statusCode >= 500) return "temporary";
    if (/CANCEL/.test(error.code)) return "cancelled";
  }
  if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
  return "permanent";
}

export function isRetryableModelFailure(error: unknown): boolean {
  return ["timeout", "rate-limit", "temporary", "protocol", "empty"]
    .includes(classifyModelFailure(error));
}

async function invokeValidated<T extends object>(
  model: AgentRuntimeModel,
  input: {
    messages: AgentModelMessage[];
    schema: Record<string, any>;
    signal?: AbortSignal;
  },
): Promise<T> {
  const rawValue = await model.invokeJson<T>(input);
  const value = normalizeModelDecision(rawValue, input.schema) as T;
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    throw emptyModelError();
  }
  const ajv = new Ajv({ allErrors: true, strict: false });
  ajv.addFormat("base64", true);
  const validate = ajv.compile(input.schema);
  if (!validate(value)) {
    throw new AgentRuntimeError(
      `Agent model decision failed schema validation: ${JSON.stringify(validate.errors)}`,
      "AGENT_MODEL_PROTOCOL_INVALID",
      "The model could not produce a valid agent decision",
      502,
    );
  }
  return value;
}

function normalizeModelDecision(value: unknown, schema: Record<string, any>): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;

  if (isArgumentDecisionSchema(schema)) {
    if (record.action === "call" || record.action === "clarify") return value;
    if (record.action_input && typeof record.action_input === "object" && !Array.isArray(record.action_input)) {
      return { action: "call", arguments: record.action_input };
    }
    if (record.arguments && typeof record.arguments === "object" && !Array.isArray(record.arguments)) {
      return { action: "call", arguments: record.arguments };
    }
    return { action: "call", arguments: record };
  }

  if (typeof record.mode === "string") return value;

  const toolName = firstString(record.toolName, record.tool, record.name, record.action);
  if (toolName && schemaAllowsTool(schema, toolName)) {
    return {
      mode: "tool",
      toolName,
      objective: firstString(record.objective, record.reason, record.description) || `Execute ${toolName}`,
      ...(schemaAllowsToolArguments(schema, toolName) &&
        (record.arguments ?? record.action_input) && typeof (record.arguments ?? record.action_input) === "object"
        ? { arguments: record.arguments ?? record.action_input }
        : {}),
    };
  }
  const question = firstString(record.question, record.clarification);
  if (question) return { mode: "clarify", question };
  const response = firstString(record.response, record.answer, record.message);
  if (response) return { mode: "chat", response };
  return value;
}

function schemaAllowsToolArguments(schema: Record<string, any>, toolName: string): boolean {
  return (Array.isArray(schema.oneOf) ? schema.oneOf : []).some((variant: any) => {
    const property = variant?.properties?.toolName;
    const matches = property?.const === toolName || (Array.isArray(property?.enum) && property.enum.includes(toolName));
    return matches && Boolean(variant?.properties?.arguments);
  });
}

function isArgumentDecisionSchema(schema: Record<string, any>): boolean {
  return (Array.isArray(schema.oneOf) ? schema.oneOf : []).some((variant: any) =>
    variant?.properties?.action?.const === "call" && Boolean(variant?.properties?.arguments),
  );
}

function schemaAllowsTool(schema: Record<string, any>, toolName: string): boolean {
  return (Array.isArray(schema.oneOf) ? schema.oneOf : []).some((variant: any) => {
    const property = variant?.properties?.toolName;
    return property?.const === toolName || (Array.isArray(property?.enum) && property.enum.includes(toolName));
  });
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function emptyModelError(): AgentRuntimeError {
  return new AgentRuntimeError(
    "Agent model returned an empty decision",
    "AGENT_MODEL_EMPTY_RESPONSE",
    "The model returned an empty response",
    502,
  );
}

function normalizeExhaustedError(error: unknown): AgentRuntimeError {
  if (error instanceof AgentRuntimeError) return error;
  return new AgentRuntimeError(
    error instanceof Error ? error.message : String(error),
    "AGENT_MODEL_FALLBACK_EXHAUSTED",
    "The model could not produce a valid response",
    502,
  );
}
