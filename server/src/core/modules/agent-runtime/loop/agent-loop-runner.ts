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
import {
  type AgentFileRefStore,
  resolveAgentFileRefsInToolArgs,
  storeAgentFileRefsInToolResult,
} from "./agent-file-ref-store.ts";

export interface AgentLoopModel {
  routeIntent(input: {
    messages: AgentModelMessage[];
    schema: Record<string, any>;
    signal?: AbortSignal;
  }): Promise<unknown>;
  invokeJson<T extends object>(input: {
    messages: AgentModelMessage[];
    schema: Record<string, any>;
    signal?: AbortSignal;
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
  maxRetriesPerTool?: number;
  modelCallTimeoutMs?: number;
  abortSignal?: AbortSignal;
  skipFinalResponseAfterToolUse?: boolean;
  fileRefStore?: AgentFileRefStore;
  approvedTool?: {
    toolName: string;
    params: Record<string, unknown>;
    resumeState?: unknown;
  };
  emitEvent: (event: AgentGraphEvent) => void;
}

interface AgentLoopDecision {
  action: "tool" | "final";
  toolName?: string;
  params?: Record<string, unknown>;
  response?: string;
  reason?: string;
}

interface AgentLoopResumeState {
  history: AgentLoopHistoryItem[];
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>;
  successfulToolCallKeys: string[];
  toolCallCount: number;
  toolAttemptCount: number;
}

export async function runAgentLoop(input: RunAgentLoopInput): Promise<AgentRunResult> {
  const tools = new Map(input.tools.map((tool) => [tool.name, tool]));
  const resumeState = normalizeLoopResumeState(input.approvedTool?.resumeState);
  if (input.approvedTool && !resumeState) {
    const result = await runApprovedTool(input, tools, input.approvedTool);
    return success(result.output, result.toolCallCount, 1, result.toolCalls);
  }

  if (!resumeState) {
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
  }

  const history: AgentLoopHistoryItem[] = [...(resumeState?.history ?? [])];
  const toolCalls: NonNullable<AgentRunResult["toolCalls"]> = [...(resumeState?.toolCalls ?? [])];
  const requiredTools = inferRequiredTools(input.userMessage, input.tools);
  const maxIterations = input.maxIterations ?? 6;
  const maxToolCalls = input.maxToolCalls ?? 6;
  const maxRetriesPerTool = input.maxRetriesPerTool ?? 3;
  const modelCallTimeoutMs = input.modelCallTimeoutMs ?? 30000;
  const retryCounts = new Map<string, number>();
  const successfulToolCallKeys = new Set(resumeState?.successfulToolCallKeys ?? []);
  let toolCallCount = resumeState?.toolCallCount ?? 0;
  let toolAttemptCount = resumeState?.toolAttemptCount ?? 0;

  if (input.approvedTool && resumeState) {
    if (toolAttemptCount >= maxToolCalls) {
      throw new AgentRuntimeError(
        "Agent loop exceeded the configured tool call limit",
        "AGENT_LOOP_TOOL_LIMIT_EXCEEDED",
        "Agent exceeded the tool call limit",
        400,
      );
    }
    const approvedResult = await runApprovedTool(
      input,
      tools,
      input.approvedTool,
      `tool_call_${toolAttemptCount + 1}`,
    );
    toolAttemptCount += 1;
    toolCallCount += approvedResult.toolCallCount;
    history.push({
      type: "tool_result",
      toolName: input.approvedTool.toolName,
      result: approvedResult.historyResult,
    });
    toolCalls.push(...approvedResult.toolCalls);
    if (approvedResult.tool) {
      successfulToolCallKeys.add(createSuccessfulToolCallKey(approvedResult.tool, input.approvedTool.params));
    }
  }

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    input.emitEvent({ type: "agent:thinking", payload: { message: "Thinking" } } as AgentGraphEvent);
    let decision: AgentLoopDecision;
    try {
      decision = await readLoopDecision({ ...input, modelCallTimeoutMs }, history);
    } catch (error) {
      const fallbackDecision = fallbackLoopDecision({
        error,
        userMessage: input.userMessage,
        requiredTools,
        toolCalls,
        history,
      });
      if (!fallbackDecision) throw error;
      decision = fallbackDecision;
    }

    if (decision.action === "final") {
      const unmetTools = unmetRequiredTools(requiredTools, toolCalls);
      if (unmetTools.length > 0) {
        history.push({
          type: "tool_error",
          toolName: "agent_loop",
          error: [
            "Request is not complete yet.",
            `Still need to use: ${unmetTools.map((tool) => tool.name).join(", ")}.`,
            "Continue with the next required tool instead of final answer.",
          ].join(" "),
        });
        continue;
      }
      return success(decision.response ?? "", toolCallCount, iteration, toolCalls);
    }

    if (toolAttemptCount >= maxToolCalls) {
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

    const displayParams = decision.params ?? {};
    const successfulToolCallKey = createSuccessfulToolCallKey(tool, displayParams);
    const missingFileRefError = approvalMissingAvailableFileRef(tool, displayParams, history);
    if (missingFileRefError) {
      history.push({
        type: "tool_error",
        toolName: tool.name,
        error: missingFileRefError,
      });
      continue;
    }
    const repeatedCompletedReadError = completedReadToolReplayError(tool, requiredTools, toolCalls, history);
    if (repeatedCompletedReadError) {
      history.push({
        type: "tool_error",
        toolName: tool.name,
        error: repeatedCompletedReadError,
      });
      continue;
    }
    if (successfulToolCallKeys.has(successfulToolCallKey)) {
      history.push({
        type: "tool_error",
        toolName: tool.name,
        error: [
          `Tool ${tool.name} already succeeded with the same params.`,
          "Use the previous tool result from history and continue with the next required tool or final answer.",
        ].join(" "),
      });
      continue;
    }

    toolAttemptCount += 1;
    const toolCallId = `tool_call_${toolAttemptCount}`;
    const params = shouldResolveFileRefsBeforeInvoke(tool)
      ? resolveAgentFileRefsInToolArgs({
          store: input.fileRefStore,
          value: displayParams,
        }) as Record<string, unknown>
      : displayParams;
    input.emitEvent(toolEvent("agent:tool-intent", tool, toolCallId, "planned", decision.reason, undefined, {
      params: sanitizeAgentToolValue(displayParams),
    }));
    if (!tool.requiresApproval) {
      input.emitEvent(toolEvent("agent:tool-start", tool, toolCallId, "running", decision.reason, undefined, {
        params: sanitizeAgentToolValue(displayParams),
      }));
    }

    try {
      const result = await tool.invoke(params);
      const modelSafeResult = await storeAgentFileRefsInToolResult({
        store: input.fileRefStore,
        toolCallId,
        value: result,
      });
      toolCallCount += 1;
      retryCounts.delete(tool.name);
      successfulToolCallKeys.add(successfulToolCallKey);
      history.push({ type: "tool_result", toolName: tool.name, result: modelSafeResult });
      toolCalls.push(toToolCall(tool, toolCallId, "success"));
      input.emitEvent(toolEvent("agent:tool-end", tool, toolCallId, "success", decision.reason, undefined, {
        output: sanitizeAgentToolValue(modelSafeResult),
      }));
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) {
        attachLoopResumeState(error, {
          history,
          toolCalls,
          successfulToolCallKeys: [...successfulToolCallKeys],
          toolCallCount,
          toolAttemptCount,
        });
        throw error;
      }
      history.push({ type: "tool_error", toolName: tool.name, error: safeErrorMessage(error) });
      const repairable = isRepairableLoopError(error);
      const retryCount = retryCounts.get(tool.name) ?? 0;
      const retryAllowed = repairable && retryCount < maxRetriesPerTool;
      input.emitEvent(toolEvent(
        "agent:tool-end",
        tool,
        toolCallId,
        "failed",
        decision.reason,
        safeErrorMessage(error),
      ));
      if (retryAllowed) {
        retryCounts.set(tool.name, retryCount + 1);
        input.emitEvent(toolEvent(
          "agent:tool-retry",
          tool,
          toolCallId,
          "retrying",
          decision.reason,
          safeErrorMessage(error),
        ));
      }
      if (!retryAllowed) {
        toolCalls.push(toToolCall(tool, toolCallId, "failed"));
        throw error;
      }
    }
  }

  const unmetTools = unmetRequiredTools(requiredTools, toolCalls);
  if (unmetTools.length > 0) {
    throw new AgentRuntimeError(
      `Agent loop ended with required tools still pending: ${unmetTools.map((tool) => tool.name).join(", ")}`,
      "AGENT_LOOP_REQUIRED_TOOLS_PENDING",
      "Agent could not complete all required tool steps",
      400,
    );
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

async function runApprovedTool(
  input: RunAgentLoopInput,
  tools: Map<string, AgentPlanTool>,
  approvedTool: NonNullable<RunAgentLoopInput["approvedTool"]>,
  toolCallId = "tool_call_1",
): Promise<{
  output: AgentRunResult["output"];
  toolCallCount: number;
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>;
  historyResult: unknown;
  tool: AgentPlanTool;
}> {
  const tool = tools.get(approvedTool.toolName);
  if (!tool) {
    throw new AgentRuntimeError(
      `Unknown approved agent loop tool: ${approvedTool.toolName}`,
      "AGENT_TOOL_UNKNOWN",
      "Agent approval referenced an unavailable tool",
      400,
    );
  }

  const params = resolveAgentFileRefsInToolArgs({
    store: input.fileRefStore,
    value: approvedTool.params,
  }) as Record<string, unknown>;
  input.emitEvent(toolEvent("agent:tool-intent", tool, toolCallId, "planned", "Approved by user.", undefined, {
    params: sanitizeAgentToolValue(approvedTool.params),
  }));
  input.emitEvent(toolEvent("agent:tool-start", tool, toolCallId, "running", "Approved by user.", undefined, {
    params: sanitizeAgentToolValue(approvedTool.params),
  }));

  try {
    const result = await tool.invoke(params);
    const modelSafeResult = await storeAgentFileRefsInToolResult({
      store: input.fileRefStore,
      toolCallId,
      value: result,
    });
    input.emitEvent(toolEvent("agent:tool-end", tool, toolCallId, "success", "Approved by user.", undefined, {
      output: sanitizeAgentToolValue(modelSafeResult),
    }));
    return {
      output: input.skipFinalResponseAfterToolUse
        ? sanitizeAgentToolValue(modelSafeResult) as AgentRunResult["output"]
        : await generateAgentFinalResponse({
            model: input.model,
            userMessage: input.userMessage,
            plan: emptyPlan(),
            execution: {
              status: "success",
              output: sanitizeAgentToolValue(modelSafeResult),
              toolCallCount: 1,
              iterationCount: 1,
              toolCalls: [toToolCall(tool, toolCallId, "success")],
              outputs: { [tool.name]: sanitizeAgentToolValue(modelSafeResult) },
            },
          }) as AgentRunResult["output"],
      toolCallCount: 1,
      toolCalls: [toToolCall(tool, toolCallId, "success")],
      historyResult: modelSafeResult,
      tool,
    };
  } catch (error) {
    if (error instanceof AgentToolApprovalRequiredError) throw error;
    input.emitEvent(toolEvent("agent:tool-end", tool, toolCallId, "failed", "Approved by user.", safeErrorMessage(error)));
    throw error;
  }
}

async function readLoopDecision(
  input: RunAgentLoopInput & { modelCallTimeoutMs: number },
  history: AgentLoopHistoryItem[],
): Promise<AgentLoopDecision> {
  const messages = buildLoopMessages(input, history);
  try {
    return normalizeDecision(await invokeLoopDecisionJson(input, messages));
  } catch (error) {
    if (!isInvalidJsonModelError(error) && !isLoopDecisionTimeout(error)) throw error;
    const retryReason = isLoopDecisionTimeout(error)
      ? [
          "Previous loop decision timed out.",
          "Continue from the history. Do not repeat completed tools.",
          "Return only one valid minified JSON object for the next required tool or final answer.",
        ]
      : [
          "Previous response was invalid JSON.",
          "Return only one valid minified JSON object.",
          "No markdown. No comments. No trailing commas.",
          "Tool call: {\"action\":\"tool\",\"toolName\":\"tool_name\",\"params\":{},\"reason\":\"short reason\"}",
          "Final answer: {\"action\":\"final\",\"response\":\"short answer\"}",
        ];
    return normalizeDecision(await invokeLoopDecisionJson(input, [
      ...messages,
      {
        role: "system",
        content: retryReason.join("\n"),
      },
    ]));
  }
}

function invokeLoopDecisionJson(
  input: RunAgentLoopInput & { modelCallTimeoutMs: number },
  messages: AgentModelMessage[],
): Promise<AgentLoopDecision> {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(input.abortSignal?.reason);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  if (input.abortSignal?.aborted) abortFromParent();
  else input.abortSignal?.addEventListener("abort", abortFromParent, { once: true });

  const modelPromise = input.model.invokeJson<AgentLoopDecision>({
    messages,
    schema: loopDecisionSchema(),
    signal: controller.signal,
  });

  return new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort(new Error("Agent loop model decision timed out"));
      reject(new AgentRuntimeError(
        "Agent loop model decision timed out",
        "AGENT_LOOP_DECISION_TIMEOUT",
        "Agent model decision timed out",
        502,
      ));
    }, input.modelCallTimeoutMs);

    modelPromise.then(resolve, reject).finally(() => {
      if (timeout) clearTimeout(timeout);
      input.abortSignal?.removeEventListener("abort", abortFromParent);
    });
  });
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
        "When history contains an agent-file:// ref, pass that ref object to the next tool instead of inventing file ids or attachment content.",
        "Do not return a final answer until every requested operation has a successful tool result.",
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

function isInvalidJsonModelError(error: unknown): boolean {
  return error instanceof AgentRuntimeError && error.code === "AGENT_MODEL_JSON_INVALID";
}

function isLoopDecisionTimeout(error: unknown): boolean {
  return error instanceof AgentRuntimeError && error.code === "AGENT_LOOP_DECISION_TIMEOUT";
}

function fallbackLoopDecision(input: {
  error: unknown;
  userMessage: string;
  requiredTools: AgentPlanTool[];
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>;
  history: AgentLoopHistoryItem[];
}): AgentLoopDecision | null {
  if (!isInvalidJsonModelError(input.error) && !isLoopDecisionTimeout(input.error)) return null;
  const tool = unmetRequiredTools(input.requiredTools, input.toolCalls)[0];
  if (!tool) return null;
  const params = inferFallbackToolParams(tool, input.userMessage, input.history);
  if (!hasRequiredFallbackParams(tool, params)) return null;
  return {
    action: "tool",
    toolName: tool.name,
    params,
    reason: "Fallback after model decision failure.",
  };
}

function inferFallbackToolParams(
  tool: AgentPlanTool,
  userMessage: string,
  history: AgentLoopHistoryItem[],
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const properties = tool.inputSchema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return params;
  const email = extractFirstEmail(userMessage);
  const file = latestFileLikeResult(history);
  const url = latestUrlResult(history);

  for (const [name, schema] of Object.entries(properties)) {
    const property = schema as Record<string, unknown>;
    const hint = normalizeSearchText([
      name,
      property.description,
      property["x-label"],
      property["x-input-type"],
      property.format,
    ].filter((item) => typeof item === "string").join(" "));
    const type = typeof property.type === "string" ? property.type : "";

    if (email && isEmailParamHint(hint)) {
      params[name] = email;
      continue;
    }
    if (file && isFileParamHint(hint, property)) {
      params[name] = type === "array" ? [file] : file;
      continue;
    }
    if (url && isUrlParamHint(hint)) {
      params[name] = url;
      continue;
    }
  }

  return params;
}

function hasRequiredFallbackParams(tool: AgentPlanTool, params: Record<string, unknown>): boolean {
  const required = Array.isArray(tool.inputSchema?.required)
    ? tool.inputSchema.required.filter((item): item is string => typeof item === "string")
    : [];
  return required.every((key) => params[key] !== undefined && params[key] !== null && params[key] !== "");
}

function isEmailParamHint(hint: string): boolean {
  return /\b(to|email|mail|recipient|destinatario|para)\b/.test(hint);
}

function isUrlParamHint(hint: string): boolean {
  return /\b(url|link|body|message|content|texto|mensagem)\b/.test(hint);
}

function isFileParamHint(hint: string, schema: Record<string, unknown>): boolean {
  return isFileLikeParamName(hint) ||
    hint.includes("attachment") ||
    hint.includes("upload") ||
    hint.includes("media") ||
    schema.format === "binary";
}

function extractFirstEmail(value: string): string {
  return value.match(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i)?.[0] ?? "";
}

function latestFileLikeResult(history: AgentLoopHistoryItem[]): unknown {
  for (const item of [...history].reverse()) {
    if (item.type !== "tool_result") continue;
    const found = findFileLikeValue(item.result);
    if (found !== undefined) return found;
  }
  return undefined;
}

function findFileLikeValue(value: unknown): unknown {
  if (!value || typeof value !== "object" || Buffer.isBuffer(value)) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFileLikeValue(item);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.ref === "string" && record.ref.startsWith("agent-file://")) return record;
  if (
    (typeof record.fileName === "string" || typeof record.filename === "string") &&
    (record.content !== undefined || record.ref !== undefined)
  ) {
    return record;
  }
  for (const item of Object.values(record)) {
    const found = findFileLikeValue(item);
    if (found !== undefined) return found;
  }
  return undefined;
}

function latestUrlResult(history: AgentLoopHistoryItem[]): string {
  for (const item of [...history].reverse()) {
    if (item.type !== "tool_result") continue;
    const found = findUrlValue(item.result);
    if (found) return found;
  }
  return "";
}

function findUrlValue(value: unknown): string {
  if (typeof value === "string") {
    return /^https?:\/\//i.test(value) ? value : "";
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrlValue(item);
      if (found) return found;
    }
    return "";
  }
  if (!value || typeof value !== "object") return "";
  for (const item of Object.values(value as Record<string, unknown>)) {
    const found = findUrlValue(item);
    if (found) return found;
  }
  return "";
}

function isRepairableLoopError(error: unknown): boolean {
  if (!(error instanceof AgentRuntimeError)) return false;
  if (isRepairableFileNotFound(error)) return true;
  if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) return false;
  return [
    "AGENT_TOOL_ARGS_INVALID",
    "AGENT_TOOL_PARAM_MISSING",
    "AGENT_TOOL_REF_UNRESOLVED",
  ].includes(error.code) || error.statusCode === 400;
}

function isRepairableFileNotFound(error: AgentRuntimeError): boolean {
  return /Agent tool .+ failed: File not found:/i.test(error.publicMessage) ||
    /Agent tool .+ failed: File not found:/i.test(error.message);
}

function shouldResolveFileRefsBeforeInvoke(tool: AgentPlanTool): boolean {
  return tool.requiresApproval !== true;
}

function createSuccessfulToolCallKey(tool: AgentPlanTool, params: Record<string, unknown>): string {
  return `${tool.name}:${stableStringify(sanitizeAgentToolValue(schemaParamsOnly(tool, params)))}`;
}

function schemaParamsOnly(tool: AgentPlanTool, params: Record<string, unknown>): Record<string, unknown> {
  const properties = tool.inputSchema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return params;
  const allowed = new Set(Object.keys(properties));
  return Object.fromEntries(Object.entries(params).filter(([key]) => allowed.has(key)));
}

function approvalMissingAvailableFileRef(
  tool: AgentPlanTool,
  params: Record<string, unknown>,
  history: AgentLoopHistoryItem[],
): string | null {
  if (!tool.requiresApproval) return null;
  if (containsAgentFileRef(params)) return null;
  if (!containsFileLikeParam(params)) return null;
  const refs = collectAgentFileRefs(history);
  if (refs.length === 0) return null;
  return [
    "There is an already downloaded file available in history.",
    `Use this agent-file:// ref in the file or attachment params: ${refs.join(", ")}.`,
    "Do not use raw file ids, web links, filenames, or MIME metadata as attachment content.",
  ].join(" ");
}

function completedReadToolReplayError(
  tool: AgentPlanTool,
  requiredTools: AgentPlanTool[],
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>,
  history: AgentLoopHistoryItem[],
): string | null {
  if (!isReadTool(tool)) return null;
  if (!hasSuccessfulToolResult(history, tool.name)) return null;
  if (!hasPendingSideEffectTool(requiredTools, toolCalls)) return null;

  return [
    `Tool ${tool.name} already completed successfully.`,
    "Use the previous tool result from history and continue with the next pending side-effect tool.",
    "Do not repeat completed read/download/search steps unless the previous result failed.",
  ].join(" ");
}

function isReadTool(tool: AgentPlanTool): boolean {
  return tool.sideEffect === "read" || (!tool.sideEffect && !tool.requiresApproval);
}

function hasSuccessfulToolResult(history: AgentLoopHistoryItem[], toolName: string): boolean {
  return history.some((item) => item.type === "tool_result" && item.toolName === toolName);
}

function hasPendingSideEffectTool(
  requiredTools: AgentPlanTool[],
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>,
): boolean {
  return unmetRequiredTools(requiredTools, toolCalls).some((tool) =>
    tool.requiresApproval || Boolean(tool.sideEffect && tool.sideEffect !== "read")
  );
}

function attachLoopResumeState(
  error: AgentToolApprovalRequiredError,
  state: AgentLoopResumeState,
): void {
  error.approvalRequest.resumeState = {
    history: sanitizeLoopHistoryForResume(state.history),
    toolCalls: state.toolCalls.map((toolCall) => ({ ...toolCall })),
    successfulToolCallKeys: [...state.successfulToolCallKeys],
    toolCallCount: state.toolCallCount,
    toolAttemptCount: state.toolAttemptCount,
  };
}

function normalizeLoopResumeState(value: unknown): AgentLoopResumeState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    history: normalizeLoopHistory(record.history),
    toolCalls: normalizeResumeToolCalls(record.toolCalls),
    successfulToolCallKeys: Array.isArray(record.successfulToolCallKeys)
      ? record.successfulToolCallKeys.filter((item): item is string => typeof item === "string")
      : [],
    toolCallCount: safeResumeCount(record.toolCallCount),
    toolAttemptCount: safeResumeCount(record.toolAttemptCount),
  };
}

function sanitizeLoopHistoryForResume(history: AgentLoopHistoryItem[]): AgentLoopHistoryItem[] {
  return history.map((item) => {
    if (item.type === "tool_result") {
      return {
        type: "tool_result",
        toolName: item.toolName,
        result: sanitizeAgentToolValue(item.result),
      };
    }
    return {
      type: "tool_error",
      toolName: item.toolName,
      error: item.error,
    };
  });
}

function normalizeLoopHistory(value: unknown): AgentLoopHistoryItem[] {
  if (!Array.isArray(value)) return [];
  const history: AgentLoopHistoryItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const toolName = typeof record.toolName === "string" ? record.toolName : "";
    if (!toolName) continue;
    if (record.type === "tool_result") {
      history.push({ type: "tool_result", toolName, result: record.result });
    } else if (record.type === "tool_error" && typeof record.error === "string") {
      history.push({ type: "tool_error", toolName, error: record.error });
    }
  }
  return history;
}

function normalizeResumeToolCalls(value: unknown): NonNullable<AgentRunResult["toolCalls"]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.toolCallId !== "string" || typeof record.name !== "string") return [];
    const status = record.status === "failed" ? "failed" : record.status === "success" ? "success" : null;
    if (!status) return [];
    return [{
      toolCallId: record.toolCallId,
      name: record.name,
      ...(typeof record.pluginId === "string" ? { pluginId: record.pluginId } : {}),
      ...(typeof record.pluginName === "string" ? { pluginName: record.pluginName } : {}),
      status,
    }];
  });
}

function safeResumeCount(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function collectAgentFileRefs(history: AgentLoopHistoryItem[]): string[] {
  const refs = new Set<string>();
  for (const item of history) {
    if (item.type === "tool_result") collectAgentFileRefsFromValue(item.result, refs);
  }
  return [...refs];
}

function collectAgentFileRefsFromValue(value: unknown, refs: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("agent-file://")) refs.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectAgentFileRefsFromValue(item, refs);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const item of Object.values(value as Record<string, unknown>)) {
    collectAgentFileRefsFromValue(item, refs);
  }
}

function containsAgentFileRef(value: unknown): boolean {
  if (typeof value === "string") return value.startsWith("agent-file://");
  if (Array.isArray(value)) return value.some(containsAgentFileRef);
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(containsAgentFileRef);
}

function containsFileLikeParam(value: unknown, keyHint = ""): boolean {
  if (Array.isArray(value)) return value.some((item) => containsFileLikeParam(item, keyHint));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) => {
    const normalized = normalizeSearchText(key || keyHint);
    if (isFileLikeParamName(normalized)) return true;
    return containsFileLikeParam(item, key);
  });
}

function isFileLikeParamName(normalizedName: string): boolean {
  return [
    "attachment",
    "attachments",
    "file",
    "files",
    "document",
    "documents",
    "media",
    "contentbase64",
  ].some((token) => normalizedName === token || normalizedName.endsWith(token));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

function inferRequiredTools(userMessage: string, tools: AgentPlanTool[]): AgentPlanTool[] {
  const requestText = normalizeSearchText(userMessage);
  if (!requestText) return [];
  const required = tools.filter((tool) => requiredToolScore(tool, requestText) >= 5);
  const hasRequiredSideEffect = required.some((tool) => Boolean(tool.sideEffect && tool.sideEffect !== "read") || tool.requiresApproval);
  if (!hasRequiredSideEffect) return required;

  const prerequisiteReads = tools.filter((tool) =>
    !required.includes(tool) &&
    (tool.sideEffect === "read" || !tool.sideEffect) &&
    requiredToolScore(tool, requestText) >= 4
  );
  return [
    ...prerequisiteReads,
    ...required.flatMap((tool) => Array.from({ length: requiredToolOccurrenceCount(tool, requestText) }, () => tool)),
  ];
}

function unmetRequiredTools(
  requiredTools: AgentPlanTool[],
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>,
): AgentPlanTool[] {
  const completed = new Map<string, number>();
  for (const toolCall of toolCalls) {
    if (toolCall.status !== "success") continue;
    completed.set(toolCall.name, (completed.get(toolCall.name) ?? 0) + 1);
  }
  const used = new Map<string, number>();
  return requiredTools.filter((tool) => {
    const current = used.get(tool.name) ?? 0;
    used.set(tool.name, current + 1);
    return current >= (completed.get(tool.name) ?? 0);
  });
}

function requiredToolOccurrenceCount(tool: AgentPlanTool, requestText: string): number {
  if (!tool.requiresApproval && (!tool.sideEffect || tool.sideEffect === "read")) return 1;
  const toolText = normalizeSearchText([
    tool.name,
    tool.description,
    tool.instructions ?? "",
    tool.pluginId ?? "",
    tool.pluginName ?? "",
    tool.methodId ?? "",
  ].join(" "));
  if (!toolActionAliases().send.some((alias) => toolText.includes(alias))) return 1;
  return Math.max(1, Math.min(3, countSendActionMentions(requestText)));
}

function countSendActionMentions(requestText: string): number {
  return requestText.match(/\b(email|mail|message|mensagem|mensagens)\b/g)?.length ?? 0;
}

function requiredToolScore(tool: AgentPlanTool, requestText: string): number {
  const toolText = normalizeSearchText([
    tool.name,
    tool.description,
    tool.instructions ?? "",
    tool.pluginId ?? "",
    tool.pluginName ?? "",
    tool.methodId ?? "",
  ].join(" "));
  const toolTokens = new Set(toolText.split(" ").filter(isUsefulToolToken));
  const requestTokens = new Set(requestText.split(" ").filter(Boolean));
  let score = 0;
  for (const token of toolTokens) {
    if (requestTokens.has(token)) score += token.length >= 6 ? 2 : 1;
  }
  for (const [action, aliases] of Object.entries(toolActionAliases())) {
    if (!aliases.some((alias) => requestText.includes(alias))) continue;
    if (toolText.includes(action) || aliases.some((alias) => toolText.includes(alias))) score += 5;
  }
  if ((tool.sideEffect && tool.sideEffect !== "read") || tool.requiresApproval) {
    if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(requestText)) score += 4;
    if (requestText.includes("send") || requestText.includes("envie") || requestText.includes("enviar")) score += 2;
  }
  return score;
}

function toolActionAliases(): Record<string, string[]> {
  return {
    list: ["list", "find", "search", "lookup", "procure", "procurar", "busque", "buscar", "liste", "listar"],
    download: ["download", "baixar", "baixe", "fetch", "retrieve"],
    send: ["send", "sent", "email", "mail", "message", "envie", "enviar", "mande", "mandar"],
    upload: ["upload", "subir", "enviar"],
    create: ["create", "criar", "crie"],
    update: ["update", "atualizar", "atualize"],
    delete: ["delete", "remove", "deletar", "remover"],
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulToolToken(token: string): boolean {
  return token.length >= 3 &&
    !new Set([
      "google",
      "tool",
      "with",
      "from",
      "para",
      "this",
      "that",
      "file",
      "files",
      "message",
      "method",
    ]).has(token);
}

function summarizeToolParams(schema: Record<string, any>): Array<{
  name: string;
  type: string;
  required: boolean;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  label?: string;
  inputType?: string;
  format?: string;
}> {
  const properties = schema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return [];
  const required = new Set(Array.isArray(schema.required) ? schema.required.filter((item) => typeof item === "string") : []);
  return Object.entries(properties).slice(0, 12).map(([name, value]) => {
    const param = value as {
      type?: unknown;
      description?: unknown;
      default?: unknown;
      enum?: unknown;
    };
    return {
      name,
      type: typeof param?.type === "string" ? String(param.type) : "unknown",
      required: required.has(name),
      ...(typeof param?.description === "string" && param.description.trim()
        ? { description: param.description.trim().slice(0, 240) }
        : {}),
      ...(param?.default !== undefined ? { default: sanitizeAgentToolValue(param.default) } : {}),
      ...(Array.isArray(param?.enum)
        ? { enum: param.enum.slice(0, 20).map((item) => sanitizeAgentToolValue(item)) }
        : {}),
      ...(typeof (param as Record<string, unknown>)?.["x-label"] === "string"
        ? { label: String((param as Record<string, unknown>)["x-label"]).slice(0, 120) }
        : {}),
      ...(typeof (param as Record<string, unknown>)?.["x-input-type"] === "string"
        ? { inputType: String((param as Record<string, unknown>)["x-input-type"]).slice(0, 80) }
        : {}),
      ...(typeof (param as Record<string, unknown>)?.format === "string"
        ? { format: String((param as Record<string, unknown>).format).slice(0, 80) }
        : {}),
    };
  });
}

function loopDecisionSchema(): Record<string, any> {
  return {
    type: "object",
    additionalProperties: false,
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
  details?: Record<string, unknown>,
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
      ...(details ? { details } : {}),
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
