import { randomUUID } from "node:crypto";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "../agent-errors.ts";
import { detectAgentChoice } from "./agent-choice-detector.ts";
import type {
  AgentPlan,
  AgentPlanEvent,
  AgentPlanExecutionResult,
  AgentPlanStep,
  AgentPlanTool,
  AgentStepRepair,
} from "./agent-plan-types.ts";

export interface ExecuteAgentPlanInput {
  plan: AgentPlan;
  tools: AgentPlanTool[];
  emitEvent: (event: AgentPlanEvent) => void;
  executionId?: string;
  approval?: {
    status: "approved" | "rejected";
    toolName?: string;
    stepId?: string;
    outputs?: Record<string, unknown>;
  };
  createApprovalRequest?: (request: AgentPlanApprovalRequest) => Promise<{ approvalId: string }> | { approvalId: string };
  saveMessage?: (message: Record<string, unknown>) => void | Promise<void>;
  repairStep?: (input: {
    plan: AgentPlan;
    step: AgentPlanStep;
    tool: AgentPlanTool;
    error: unknown;
    outputs: Record<string, unknown>;
  }) => Promise<AgentStepRepair>;
}

export interface AgentPlanApprovalRequest {
  approvalId: string;
  executionId?: string;
  toolName: string;
  sideEffect?: string;
  args: Record<string, unknown>;
}

export async function executeAgentPlan(input: ExecuteAgentPlanInput): Promise<AgentPlanExecutionResult> {
  const tools = new Map(input.tools.map((tool) => [tool.name, tool]));
  const outputs: Record<string, unknown> = { ...(input.approval?.outputs ?? {}) };
  const toolCalls: NonNullable<AgentPlanExecutionResult["toolCalls"]> = [];
  let toolCallCount = 0;

  const startIndex = resolveStartIndex(input);
  for (const step of input.plan.steps.slice(startIndex)) {
    const tool = tools.get(step.toolName);
    if (!tool) {
      throw new AgentRuntimeError(
        `Unknown agent plan tool: ${step.toolName}`,
        "AGENT_TOOL_UNKNOWN",
        "Agent requested an unavailable tool",
        400,
      );
    }

    const toolCallId = `tool_call_${toolCallCount + 1}`;
    emitToolEvent(input, "agent:tool-intent", tool, toolCallId, "planned", step.reason);
    const params = resolveRefs(step.params, outputs);
    const approvalResult = await requestApprovalIfNeeded(input, step, tool, params, outputs);
    if (approvalResult) return approvalResult;
    emitToolEvent(input, "agent:tool-start", tool, toolCallId, "running", step.reason);

    let result: unknown;
    try {
      result = await tool.invoke(params);
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) throw error;
      const repaired = await tryRepairStep(input, step, tool, error, outputs);
      if (!repaired) {
        emitToolEvent(input, "agent:tool-end", tool, toolCallId, "failed", step.reason, safeErrorMessage(error));
        toolCalls.push(toToolCall(tool, toolCallId, "failed"));
        throw error;
      }

      emitToolEvent(input, "agent:tool-retry", tool, toolCallId, "retrying", "Creating new parameters.");
      result = await tool.invoke(resolveRefs(repaired.params, outputs));
    }

    outputs[step.id] = result;
    toolCallCount += 1;
    emitToolEvent(input, "agent:tool-end", tool, toolCallId, "success", step.reason);
    toolCalls.push(toToolCall(tool, toolCallId, "success"));

    const choice = detectAgentChoice({ tool, result });
    if (choice) {
      return {
        status: "waiting-user",
        output: {
          ...choice,
          waitingUser: true,
          text: choice.question,
        },
        toolCallCount,
        iterationCount: 1,
        toolCalls,
        outputs,
      };
    }
  }

  return {
    status: "success",
    output: outputs,
    toolCallCount,
    iterationCount: 1,
    toolCalls,
    outputs,
  };
}

function resolveStartIndex(input: ExecuteAgentPlanInput): number {
  if (!input.approval?.stepId) return 0;
  const index = input.plan.steps.findIndex((step) => step.id === input.approval?.stepId);
  return index >= 0 ? index : 0;
}

async function requestApprovalIfNeeded(
  input: ExecuteAgentPlanInput,
  step: AgentPlanStep,
  tool: AgentPlanTool,
  params: unknown,
  outputs: Record<string, unknown>,
): Promise<AgentPlanExecutionResult | null> {
  if (!tool.requiresApproval) return null;

  if (input.approval?.status === "rejected" && isApprovalForStep(input, step, tool)) {
    return {
      status: "cancelled",
      output: { reason: "approval_rejected", toolName: tool.name },
      toolCallCount: 0,
      iterationCount: 1,
      toolCalls: [],
      outputs,
    };
  }

  if (input.approval?.status === "approved" && isApprovalForStep(input, step, tool)) return null;

  const approvalId = `approval_${randomUUID()}`;
  const request = {
    approvalId,
    executionId: input.executionId,
    toolName: tool.name,
    sideEffect: tool.sideEffect,
    args: sanitizeApprovalArgs(params),
  };
  const created = await input.createApprovalRequest?.(request);
  const persistedApprovalId = created?.approvalId ?? approvalId;
  const payload = { ...request, approvalId: persistedApprovalId };

  input.emitEvent({ type: "agent:approval-created", payload });
  await input.saveMessage?.({ kind: "agentApproval", ...payload });

  return {
    status: "waiting-approval",
    output: payload,
    approvalId: persistedApprovalId,
    toolCallCount: 0,
    iterationCount: 1,
    toolCalls: [],
    outputs,
  };
}

function isApprovalForStep(
  input: ExecuteAgentPlanInput,
  step: AgentPlanStep,
  tool: AgentPlanTool,
): boolean {
  return (!input.approval?.toolName || input.approval.toolName === tool.name) &&
    (!input.approval?.stepId || input.approval.stepId === step.id);
}

function sanitizeApprovalArgs(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== "object" || Array.isArray(params)) return {};
  return sanitizeValue(params) as Record<string, unknown>;
}

function sanitizeValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) return { type: "buffer", bytes: value.byteLength };
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizeValue(item)]),
  );
}

async function tryRepairStep(
  input: ExecuteAgentPlanInput,
  step: AgentPlanStep,
  tool: AgentPlanTool,
  error: unknown,
  outputs: Record<string, unknown>,
): Promise<AgentStepRepair | null> {
  if (!input.repairStep || !isParameterError(error)) return null;
  return input.repairStep({ plan: input.plan, step, tool, error, outputs });
}

function isParameterError(error: unknown): boolean {
  return error instanceof AgentRuntimeError &&
    (error.code === "AGENT_TOOL_ARGS_INVALID" || error.statusCode === 400);
}

function resolveRefs(value: unknown, outputs: Record<string, unknown>): unknown {
  if (typeof value === "string" && value.startsWith("$steps.")) {
    return resolveStepPath(value, outputs);
  }

  if (Array.isArray(value)) return value.map((item) => resolveRefs(item, outputs));

  if (!value || typeof value !== "object" || Buffer.isBuffer(value)) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      resolveRefs(item, outputs),
    ]),
  );
}

function resolveStepPath(path: string, outputs: Record<string, unknown>): unknown {
  const normalized = path
    .replace(/^\$steps\./, "")
    .replace(/\[(\d+)\]/g, ".$1");
  const [stepId, ...parts] = normalized.split(".").filter(Boolean);
  let current: unknown = outputs[stepId];
  for (const part of parts) {
    if (Array.isArray(current)) {
      current = current[Number(part)];
      continue;
    }
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function emitToolEvent(
  input: ExecuteAgentPlanInput,
  type: AgentPlanEvent["type"],
  tool: AgentPlanTool,
  toolCallId: string,
  status: "planned" | "running" | "retrying" | "success" | "failed",
  reason?: string,
  error?: string,
): void {
  input.emitEvent({
    type,
    payload: {
      status,
      reason,
      ...(error ? { error } : {}),
      tool: {
        toolCallId,
        name: tool.name,
        pluginId: tool.pluginId,
        pluginName: tool.pluginName,
        reason,
      },
    },
  });
}

function toToolCall(
  tool: AgentPlanTool,
  toolCallId: string,
  status: "success" | "failed",
) {
  return {
    toolCallId,
    name: tool.name,
    ...(tool.pluginId ? { pluginId: tool.pluginId } : {}),
    ...(tool.pluginName ? { pluginName: tool.pluginName } : {}),
    status,
  };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim() || "Unknown error";
}
