import { AgentRuntimeError } from "../agent-errors.ts";
import { AGENT_LIMITS } from "../agent-limits.ts";
import type { InternalMcpToolCall, InternalMcpToolResult } from "./internal-mcp-types.ts";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";

export function validateInternalMcpResult(
  expected: InternalMcpToolCall,
  value: unknown,
  outputSchema?: Record<string, unknown>,
): asserts value is InternalMcpToolResult {
  if (!isRecord(value) || !isRecord(value.call) || !isRecord(value.toolCall)) {
    throw invalidResult("Result envelope is malformed");
  }
  if (
    value.call.id !== expected.id ||
    value.call.name !== expected.name ||
    value.toolCall.toolCallId !== expected.id ||
    value.toolCall.name !== expected.name
  ) {
    throw invalidResult("Result envelope does not match the requested call");
  }
  if (value.toolCall.status !== "success") {
    throw invalidResult("Successful MCP response has an invalid status");
  }
  assertResultPayload(value.content);
  if (outputSchema) assertOutputSchema(expected.name, outputSchema, value.content);
}

function assertOutputSchema(
  toolName: string,
  schema: Record<string, unknown>,
  content: unknown,
): void {
  const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: false });
  (addFormats as unknown as (instance: Ajv) => void)(ajv);
  let valid: boolean;
  try {
    valid = ajv.validate(schema, content);
  } catch {
    throw invalidResult(`Tool ${toolName} declares an invalid output schema`);
  }
  if (!valid) {
    throw invalidResult(`Tool ${toolName} output does not match its declared schema`);
  }
}

function assertResultPayload(value: unknown): void {
  if (Buffer.isBuffer(value)) {
    if (value.byteLength > AGENT_LIMITS.maxToolResultBytes) {
      throw invalidResult("Binary result exceeds the maximum size");
    }
    return;
  }

  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw invalidResult("Result must be JSON serializable");
  }
  if (Buffer.byteLength(encoded ?? "", "utf8") > AGENT_LIMITS.maxToolResultBytes) {
    throw invalidResult("Result exceeds the maximum payload size");
  }
  const stats = countJson(value);
  if (stats.depth > AGENT_LIMITS.maxJsonDepth) {
    throw invalidResult("Result exceeds the maximum JSON depth");
  }
  if (stats.keys > AGENT_LIMITS.maxJsonKeys) {
    throw invalidResult("Result contains too many JSON keys");
  }
}

function countJson(value: unknown, depth = 0): { depth: number; keys: number } {
  if (!value || typeof value !== "object" || Buffer.isBuffer(value)) {
    return { depth, keys: 0 };
  }
  if (Array.isArray(value)) {
    return value.reduce<{ depth: number; keys: number }>(
      (total, item) => {
        const child = countJson(item, depth + 1);
        return { depth: Math.max(total.depth, child.depth), keys: total.keys + child.keys };
      },
      { depth, keys: 0 },
    );
  }
  return Object.values(value as Record<string, unknown>).reduce<{ depth: number; keys: number }>(
    (total, item) => {
      const child = countJson(item, depth + 1);
      return { depth: Math.max(total.depth, child.depth), keys: total.keys + child.keys + 1 };
    },
    { depth, keys: 0 },
  );
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function invalidResult(detail: string): AgentRuntimeError {
  return new AgentRuntimeError(
    `Invalid internal MCP result: ${detail}`,
    "AGENT_TOOL_RESULT_INVALID",
    "Tool returned an invalid result",
    502,
  );
}
