import crypto from "node:crypto";
import { PluginExecutor } from "../plugins/executor.ts";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "./agent-errors.ts";
import { sanitizeAgentEventPayload } from "./agent-event-sanitizer.ts";
import { AGENT_LIMITS } from "./agent-limits.ts";
import type { AiToolNodeConfig } from "./agent-types.ts";
import type { SailorAgentToolDefinition } from "./plugin-tool-adapter.ts";

const completedSideEffectToolResults = new Map<string, unknown>();
const MAX_COMPLETED_SIDE_EFFECT_TOOL_RESULTS = 1000;

export async function executePluginAgentTool(input: {
  definition: SailorAgentToolDefinition;
  configuredTool: AiToolNodeConfig;
  args: Record<string, any>;
  approvalToken?: string;
  approvalToolName?: string;
  executionId: string;
  workflowId: string;
  nodeId: string;
}): Promise<unknown> {
  const params = {
    ...(input.args ?? {}),
    ...(input.configuredTool.inputDefaults ?? {}),
  };
  assertPayloadWithinLimits(params);
  const replayKey = completedSideEffectReplayKey(input.definition, input.configuredTool, input.executionId, params);
  if (replayKey && completedSideEffectToolResults.has(replayKey)) {
    return completedSideEffectToolResults.get(replayKey);
  }
  assertToolApproval(input.definition, input.configuredTool, params, input.approvalToken, input.approvalToolName);

  try {
    const result = await withTimeout(
      PluginExecutor.execute(input.definition.pluginId, input.definition.methodId, params),
      input.configuredTool.timeoutMs ?? input.definition.timeoutMs,
      input.definition.name,
    );

    if (replayKey) rememberCompletedSideEffectToolResult(replayKey, result);
    return result;
  } catch (error) {
    if (error instanceof AgentRuntimeError) throw error;
    const detail = safeErrorMessage(error);
    if (isPluginValidationError(detail)) {
      throw new AgentRuntimeError(
        `Agent tool ${input.definition.name} failed: ${detail}`,
        "AGENT_TOOL_ARGS_INVALID",
        `Agent tool ${input.definition.name} failed: ${detail}`,
        400,
      );
    }
    throw new AgentRuntimeError(
      `Agent tool ${input.definition.name} failed: ${detail}`,
      "AGENT_TOOL_EXECUTION_FAILED",
      `Agent tool ${input.definition.name} failed: ${detail}`,
      502,
    );
  }
}

function isPluginValidationError(message: string): boolean {
  return /^Validation failed for\b/i.test(message);
}

function completedSideEffectReplayKey(
  definition: SailorAgentToolDefinition,
  configuredTool: AiToolNodeConfig,
  executionId: string,
  params: Record<string, unknown>,
): string | null {
  if (!configuredTool.requiresApproval) return null;
  const serialized = stableStringify({
    executionId,
    pluginId: definition.pluginId,
    methodId: definition.methodId,
    toolName: definition.name,
    params: toMeasurablePayload(params),
  });
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

function rememberCompletedSideEffectToolResult(key: string, result: unknown): void {
  if (completedSideEffectToolResults.size >= MAX_COMPLETED_SIDE_EFFECT_TOOL_RESULTS) {
    const oldest = completedSideEffectToolResults.keys().next().value as string | undefined;
    if (oldest) completedSideEffectToolResults.delete(oldest);
  }
  completedSideEffectToolResults.set(key, result);
}

function assertToolApproval(
  definition: SailorAgentToolDefinition,
  configuredTool: AiToolNodeConfig,
  args: Record<string, unknown>,
  approvalToken?: string,
  approvalToolName?: string,
): void {
  if (!configuredTool.requiresApproval) return;
  if (approvalToken === "approved" && (!approvalToolName || approvalToolName === definition.name)) return;

  throw new AgentToolApprovalRequiredError({
    toolName: definition.name,
    sideEffect: configuredTool.sideEffect ?? definition.sideEffect,
    args: sanitizeAgentEventPayload(args) as Record<string, unknown>,
  });
}

function assertPayloadWithinLimits(payload: unknown): void {
  const measurablePayload = toMeasurablePayload(payload);
  const stats = inspectJson(measurablePayload);
  const bytes = Buffer.byteLength(JSON.stringify(measurablePayload), "utf8");

  if (
    stats.depth > AGENT_LIMITS.maxJsonDepth ||
    stats.keys > AGENT_LIMITS.maxJsonKeys ||
    bytes > AGENT_LIMITS.maxToolPayloadBytes
  ) {
    throw new AgentRuntimeError(
      "Agent tool payload exceeds safety limits",
      "AGENT_TOOL_PAYLOAD_INVALID",
      "Agent tool payload is too large or deeply nested",
      400,
    );
  }
}

function toMeasurablePayload(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Buffer.isBuffer(value)) {
    return { type: "Buffer", size: value.byteLength };
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (typeof (value as any).pipe === "function") {
    return { type: "Readable" };
  }

  if (seen.has(value)) {
    return { type: "Circular" };
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => toMeasurablePayload(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      toMeasurablePayload(item, seen),
    ]),
  );
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJsonValue(item)]),
  );
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim() || "Unknown error";
}

function inspectJson(value: unknown, depth = 0): { depth: number; keys: number } {
  if (!value || typeof value !== "object") return { depth, keys: 0 };

  if (Array.isArray(value)) {
    return value.reduce(
      (stats, item) => {
        const child = inspectJson(item, depth + 1);
        return {
          depth: Math.max(stats.depth, child.depth),
          keys: stats.keys + child.keys,
        };
      },
      { depth, keys: 0 },
    );
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (stats, [, item]) => {
      const child = inspectJson(item, depth + 1);
      return {
        depth: Math.max(stats.depth, child.depth),
        keys: stats.keys + 1 + child.keys,
      };
    },
    { depth, keys: 0 },
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(
            new AgentRuntimeError(
              `Agent tool ${toolName} timed out`,
              "AGENT_TOOL_TIMEOUT",
              `Agent tool ${toolName} timed out`,
              504,
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    promise.catch(() => undefined);
  }
}
