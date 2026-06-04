import { AgentRuntimeError, AgentToolApprovalRequiredError } from "../agent-errors.ts";
import type { AgentGraphEvent } from "../agent-graph-builder.ts";
import type { AgentRunResult } from "../agent-types.ts";
import { generateAgentFinalResponse } from "../plan/agent-final-response-generator.ts";
import type { AgentPlan, AgentPlanTool } from "../plan/agent-plan-types.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import { routeAgentIntent } from "../intent/agent-intent-router.ts";
import {
  sanitizeAgentToolValue,
  serializeAgentLoopHistory,
  type AgentLoopHistoryItem,
} from "./agent-tool-result-sanitizer.ts";

export interface AgentLoopModel {
  routeIntent(input: {
    messages: AgentModelMessage[];
    schema: Record<string, any>;
    signal?: AbortSignal;
  }): Promise<unknown>;
  invokeJson<T extends object>(input: {
    messages: AgentModelMessage[];
    schema: Record<string, any>;
  }): Promise<T>;
  generateFinalResponse(input: { messages: AgentModelMessage[] }): Promise<string>;
}

export interface RunAgentLoopInput {
  model: AgentLoopModel;
  userMessage: string;
  contextMessages: AgentModelMessage[];
  tools: AgentPlanTool[];
  maxIterations?: number;
  maxToolCalls?: number;
  skipFinalResponseAfterToolUse?: boolean;
  emitEvent: (event: AgentGraphEvent) => void;
}

interface AgentLoopDecision {
  action: "tool" | "final";
  toolName?: string;
  params?: Record<string, unknown>;
  response?: string;
  reason?: string;
}

export async function runAgentLoop(input: RunAgentLoopInput): Promise<AgentRunResult> {
  const intent = await routeAgentIntent({
    model: input.model,
    userMessage: input.userMessage,
    contextMessages: input.contextMessages,
    tools: input.tools,
  });
  if (intent.mode === "chat") {
    const output = intent.answer?.trim() || await generateAgentFinalResponse({
      model: input.model,
      userMessage: input.userMessage,
      plan: emptyPlan(),
      execution: emptyExecution(),
    });
    return success(output, 0, 1, []);
  }

  const tools = new Map(input.tools.map((tool) => [tool.name, tool]));
  const history: AgentLoopHistoryItem[] = [];
  const toolCalls: NonNullable<AgentRunResult["toolCalls"]> = [];
  const maxIterations = input.maxIterations ?? 6;
  const maxToolCalls = input.maxToolCalls ?? 6;
  let toolCallCount = 0;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const decision = normalizeDecision(await input.model.invokeJson<AgentLoopDecision>({
      messages: buildLoopMessages(input, history),
      schema: loopDecisionSchema(),
    }));

    if (decision.action === "final") {
      return success(decision.response ?? "", toolCallCount, iteration, toolCalls);
    }

    if (toolCallCount >= maxToolCalls) {
      throw new AgentRuntimeError(
        "Agent loop exceeded the configured tool call limit",
        "AGENT_LOOP_TOOL_LIMIT_EXCEEDED",
        "Agent exceeded the tool call limit",
        400,
      );
    }

    const tool = decision.toolName ? tools.get(decision.toolName) : undefined;
    if (!tool) {
      throw new AgentRuntimeError(
        `Unknown agent loop tool: ${decision.toolName ?? ""}`,
        "AGENT_TOOL_UNKNOWN",
        "Agent requested an unavailable tool",
        400,
      );
    }

    const toolCallId = `tool_call_${toolCallCount + 1}`;
    input.emitEvent(toolEvent("agent:tool-intent", tool, toolCallId, "planned", decision.reason));
    input.emitEvent(toolEvent("agent:tool-start", tool, toolCallId, "running", decision.reason));

    try {
      const result = await tool.invoke(decision.params ?? {});
      toolCallCount += 1;
      history.push({ type: "tool_result", toolName: tool.name, result });
      toolCalls.push(toToolCall(tool, toolCallId, "success"));
      input.emitEvent(toolEvent("agent:tool-end", tool, toolCallId, "success", decision.reason));
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) throw error;
      history.push({ type: "tool_error", toolName: tool.name, error: safeErrorMessage(error) });
      input.emitEvent(toolEvent(
        isRepairableLoopError(error) ? "agent:tool-retry" : "agent:tool-end",
        tool,
        toolCallId,
        isRepairableLoopError(error) ? "retrying" : "failed",
        decision.reason,
        safeErrorMessage(error),
      ));
      if (!isRepairableLoopError(error)) {
        toolCalls.push(toToolCall(tool, toolCallId, "failed"));
        throw error;
      }
    }
  }

  const output = input.skipFinalResponseAfterToolUse
    ? sanitizeAgentToolValue(history.filter((item) => item.type === "tool_result").at(-1)?.result)
    : await generateAgentFinalResponse({
        model: input.model,
        userMessage: input.userMessage,
        plan: emptyPlan(),
        execution: {
          status: "success",
          output: sanitizeAgentToolValue(history),
          toolCallCount,
          iterationCount: maxIterations,
          toolCalls,
          outputs: { loop: sanitizeAgentToolValue(history) },
        },
      });

  return success(output as AgentRunResult["output"], toolCallCount, maxIterations, toolCalls);
}

function buildLoopMessages(input: RunAgentLoopInput, history: AgentLoopHistoryItem[]): AgentModelMessage[] {
  return [
    {
      role: "system",
      content: [
        "Run the user's request one step at a time.",
        "Return JSON only.",
        "For a tool call, return exactly: {\"action\":\"tool\",\"toolName\":\"tool_name\",\"params\":{},\"reason\":\"short reason\"}.",
        "For the final answer, return exactly: {\"action\":\"final\",\"response\":\"short answer\"}.",
        "Call only one tool per response. After a tool result, decide the next tool or final answer.",
        "Do not include binary, base64, blob, or file contents in params.",
        "Use only these tools:",
        JSON.stringify(input.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          instructions: tool.instructions ?? tool.description,
          params: summarizeToolParams(tool.inputSchema),
        }))),
      ].join("\n"),
    },
    ...input.contextMessages,
    { role: "user", content: input.userMessage },
    { role: "system", content: `History:\n${serializeAgentLoopHistory(history) || "EMPTY"}` },
  ];
}

function normalizeDecision(decision: unknown): AgentLoopDecision {
  if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
    throw invalidDecision();
  }
  const value = unwrapDecision(decision as Record<string, unknown>);
  const action = normalizeAction(value);
  if (action !== "tool" && action !== "final") throw invalidDecision();
  if (action === "final") {
    return {
      action,
      response: firstString(value.response, value.final_answer, value.finalAnswer, value.message, value.content),
      reason: firstString(value.reason, value.thought),
    };
  }

  const functionCall = firstRecord(value.function, value.function_call);
  const toolName = firstString(
    value.toolName,
    value.tool_name,
    value.tool,
    value.name,
    functionCall?.name,
  );
  const params = firstRecord(
    value.params,
    value.parameters,
    value.arguments,
    value.args,
    value.input,
    parseJsonRecord(functionCall?.arguments),
  );
  if (!toolName || !params) throw invalidDecision();

  return {
    action,
    toolName,
    params,
    reason: firstString(value.reason, value.thought),
  };
}

function normalizeAction(value: Record<string, unknown>): AgentLoopDecision["action"] | null {
  if (value.action === "tool" || value.action === "final") return value.action;
  if (
    value.type === "tool_call" ||
    value.type === "tool" ||
    value.tool ||
    value.toolName ||
    value.tool_name ||
    value.function ||
    value.function_call
  ) {
    return "tool";
  }
  if (
    value.type === "final" ||
    value.type === "answer" ||
    typeof value.final_answer === "string" ||
    typeof value.finalAnswer === "string" ||
    typeof value.message === "string"
  ) {
    return "final";
  }
  return null;
}

function unwrapDecision(value: Record<string, unknown>): Record<string, unknown> {
  const step = firstRecord(firstArrayItem(value.steps));
  if (step) return step;

  const toolCall = firstRecord(firstArrayItem(value.tool_calls), firstArrayItem(value.toolCalls));
  if (toolCall) return toolCall;

  const nested = firstRecord(value.decision, value.next, value.next_action, value.tool_call, value.toolCall);
  return nested ?? value;
}

function firstString(...values: unknown[]): string | undefined {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" ? value.trim() : undefined;
}

function firstRecord(...values: unknown[]): Record<string, unknown> | undefined {
  const value = values.find((item) => item && typeof item === "object" && !Array.isArray(item));
  return value as Record<string, unknown> | undefined;
}

function firstArrayItem(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

function parseJsonRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value);
    return firstRecord(parsed);
  } catch {
    return undefined;
  }
}

function invalidDecision(): AgentRuntimeError {
  return new AgentRuntimeError(
    "Model returned an invalid loop decision",
    "AGENT_LOOP_DECISION_INVALID",
    "Agent generated an invalid loop decision",
    400,
  );
}

function isRepairableLoopError(error: unknown): boolean {
  if (!(error instanceof AgentRuntimeError)) return false;
  if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) return false;
  return [
    "AGENT_TOOL_ARGS_INVALID",
    "AGENT_TOOL_PARAM_MISSING",
    "AGENT_TOOL_REF_UNRESOLVED",
  ].includes(error.code) || error.statusCode === 400;
}

function summarizeToolParams(schema: Record<string, any>): Array<{ name: string; type: string; required: boolean }> {
  const properties = schema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return [];
  const required = new Set(Array.isArray(schema.required) ? schema.required.filter((item) => typeof item === "string") : []);
  return Object.entries(properties).slice(0, 12).map(([name, value]) => ({
    name,
    type: typeof (value as { type?: unknown })?.type === "string" ? String((value as { type?: unknown }).type) : "unknown",
    required: required.has(name),
  }));
}

function loopDecisionSchema(): Record<string, any> {
  return {
    type: "object",
    required: ["action"],
    properties: {
      action: { type: "string", enum: ["tool", "final"] },
      toolName: { type: "string" },
      params: { type: "object" },
      response: { type: "string" },
      reason: { type: "string" },
    },
  };
}

function toolEvent(
  type: AgentGraphEvent["type"],
  tool: AgentPlanTool,
  toolCallId: string,
  status: string,
  reason?: string,
  error?: string,
): AgentGraphEvent {
  return {
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
  } as AgentGraphEvent;
}

function toToolCall(tool: AgentPlanTool, toolCallId: string, status: "success" | "failed") {
  return {
    toolCallId,
    name: tool.name,
    ...(tool.pluginId ? { pluginId: tool.pluginId } : {}),
    ...(tool.pluginName ? { pluginName: tool.pluginName } : {}),
    status,
  };
}

function emptyPlan(): AgentPlan {
  return { steps: [] };
}

function emptyExecution() {
  return {
    status: "success" as const,
    output: "",
    outputs: {},
    toolCalls: [],
    toolCallCount: 0,
    iterationCount: 1,
  };
}

function success(
  output: AgentRunResult["output"],
  toolCallCount: number,
  iterationCount: number,
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>,
): AgentRunResult {
  return {
    status: "success",
    output,
    toolCallCount,
    iterationCount,
    toolCalls,
  };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim() || "Unknown error";
}
