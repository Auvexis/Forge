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
  repairStep?: (input: {
    step: AgentPlanStep;
    tool: AgentPlanTool;
    error: unknown;
    outputs: Record<string, unknown>;
  }) => Promise<AgentStepRepair>;
}

export async function executeAgentPlan(input: ExecuteAgentPlanInput): Promise<AgentPlanExecutionResult> {
  const tools = new Map(input.tools.map((tool) => [tool.name, tool]));
  const outputs: Record<string, unknown> = {};
  const toolCalls: NonNullable<AgentPlanExecutionResult["toolCalls"]> = [];
  let toolCallCount = 0;

  for (const step of input.plan.steps) {
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
      };
    }
  }

  return {
    status: "success",
    output: outputs,
    toolCallCount,
    iterationCount: 1,
    toolCalls,
  };
}

async function tryRepairStep(
  input: ExecuteAgentPlanInput,
  step: AgentPlanStep,
  tool: AgentPlanTool,
  error: unknown,
  outputs: Record<string, unknown>,
): Promise<AgentStepRepair | null> {
  if (!input.repairStep || !isParameterError(error)) return null;
  return input.repairStep({ step, tool, error, outputs });
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
