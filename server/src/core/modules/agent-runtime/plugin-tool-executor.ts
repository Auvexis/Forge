import { PluginExecutor } from "../plugins/executor.ts";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "./agent-errors.ts";
import { emitAgentEvent } from "./agent-event-bus.ts";
import { AGENT_LIMITS } from "./agent-limits.ts";
import type { AiToolNodeConfig } from "./agent-types.ts";
import type { SailorAgentToolDefinition } from "./plugin-tool-adapter.ts";

export async function executePluginAgentTool(input: {
  definition: SailorAgentToolDefinition;
  configuredTool: AiToolNodeConfig;
  args: Record<string, any>;
  approvalToken?: string;
  executionId: string;
  workflowId: string;
  nodeId: string;
}): Promise<unknown> {
  const params = {
    ...(input.configuredTool.inputDefaults ?? {}),
    ...(input.args ?? {}),
  };
  assertPayloadWithinLimits(params);
  assertToolApproval(input.definition, input.configuredTool, params, input.approvalToken);

  emitAgentEvent({
    workflowId: input.workflowId,
    executionId: input.executionId,
    nodeId: input.nodeId,
    type: "agent:tool-start",
    payload: {
      tool: input.definition.name,
      input: params,
    },
  });

  try {
    const result = await withTimeout(
      PluginExecutor.execute(input.definition.pluginId, input.definition.methodId, params),
      input.configuredTool.timeoutMs ?? input.definition.timeoutMs,
      input.definition.name,
    );

    emitAgentEvent({
      workflowId: input.workflowId,
      executionId: input.executionId,
      nodeId: input.nodeId,
      type: "agent:tool-end",
      payload: {
        tool: input.definition.name,
        output: result,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof AgentRuntimeError) throw error;
    const detail = safeErrorMessage(error);
    throw new AgentRuntimeError(
      `Agent tool ${input.definition.name} failed: ${detail}`,
      "AGENT_TOOL_EXECUTION_FAILED",
      `Agent tool ${input.definition.name} failed: ${detail}`,
      502,
    );
  }
}

function assertToolApproval(
  definition: SailorAgentToolDefinition,
  configuredTool: AiToolNodeConfig,
  args: Record<string, unknown>,
  approvalToken?: string,
): void {
  if (!configuredTool.requiresApproval) return;
  if (approvalToken === "approved") return;

  throw new AgentToolApprovalRequiredError({
    toolName: definition.name,
    sideEffect: configuredTool.sideEffect ?? definition.sideEffect,
    args,
  });
}

function assertPayloadWithinLimits(payload: unknown): void {
  const stats = inspectJson(payload);
  const bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");

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
              "Agent tool timed out",
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
