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
  fileRefStore?: AgentFileRefStore;
  approvedTool?: {
    toolName: string;
    params: Record<string, unknown>;
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

export async function runAgentLoop(input: RunAgentLoopInput): Promise<AgentRunResult> {
  const tools = new Map(input.tools.map((tool) => [tool.name, tool]));
  if (input.approvedTool) {
    const result = await runApprovedTool(input, tools, input.approvedTool);
    return success(result.output, result.toolCallCount, 1, result.toolCalls);
  }

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

  const history: AgentLoopHistoryItem[] = [];
  const toolCalls: NonNullable<AgentRunResult["toolCalls"]> = [];
  const requiredTools = inferRequiredTools(input.userMessage, input.tools);
  const maxIterations = input.maxIterations ?? 6;
  const maxToolCalls = input.maxToolCalls ?? 6;
  let toolCallCount = 0;
  let toolAttemptCount = 0;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const decision = await readLoopDecision(input, history);

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

    toolAttemptCount += 1;
    const toolCallId = `tool_call_${toolAttemptCount}`;
    const displayParams = decision.params ?? {};
    const params = shouldResolveFileRefsBeforeInvoke(tool)
      ? resolveAgentFileRefsInToolArgs({
          store: input.fileRefStore,
          value: displayParams,
        }) as Record<string, unknown>
      : displayParams;
    input.emitEvent(toolEvent("agent:tool-intent", tool, toolCallId, "planned", decision.reason, undefined, {
      params: sanitizeAgentToolValue(displayParams),
    }));
    input.emitEvent(toolEvent("agent:tool-start", tool, toolCallId, "running", decision.reason, undefined, {
      params: sanitizeAgentToolValue(displayParams),
    }));

    try {
      const result = await tool.invoke(params);
      const modelSafeResult = await storeAgentFileRefsInToolResult({
        store: input.fileRefStore,
        toolCallId,
        value: result,
      });
      toolCallCount += 1;
      history.push({ type: "tool_result", toolName: tool.name, result: modelSafeResult });
      toolCalls.push(toToolCall(tool, toolCallId, "success"));
      input.emitEvent(toolEvent("agent:tool-end", tool, toolCallId, "success", decision.reason, undefined, {
        output: sanitizeAgentToolValue(modelSafeResult),
      }));
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) throw error;
      history.push({ type: "tool_error", toolName: tool.name, error: safeErrorMessage(error) });
      const repairable = isRepairableLoopError(error);
      input.emitEvent(toolEvent(
        "agent:tool-end",
        tool,
        toolCallId,
        "failed",
        decision.reason,
        safeErrorMessage(error),
      ));
      if (repairable) {
        input.emitEvent(toolEvent(
          "agent:tool-retry",
          tool,
          toolCallId,
          "retrying",
          decision.reason,
          safeErrorMessage(error),
        ));
      }
      if (!repairable) {
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
): Promise<{
  output: AgentRunResult["output"];
  toolCallCount: number;
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>;
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

  const toolCallId = "tool_call_1";
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
    };
  } catch (error) {
    if (error instanceof AgentToolApprovalRequiredError) throw error;
    input.emitEvent(toolEvent("agent:tool-end", tool, toolCallId, "failed", "Approved by user.", safeErrorMessage(error)));
    throw error;
  }
}

async function readLoopDecision(
  input: RunAgentLoopInput,
  history: AgentLoopHistoryItem[],
): Promise<AgentLoopDecision> {
  const messages = buildLoopMessages(input, history);
  try {
    return normalizeDecision(await input.model.invokeJson<AgentLoopDecision>({
      messages,
      schema: loopDecisionSchema(),
    }));
  } catch (error) {
    if (!isInvalidJsonModelError(error)) throw error;
    return normalizeDecision(await input.model.invokeJson<AgentLoopDecision>({
      messages: [
        ...messages,
        {
          role: "system",
          content: [
            "Previous response was invalid JSON.",
            "Return only one valid minified JSON object.",
            "No markdown. No comments. No trailing commas.",
            "Tool call: {\"action\":\"tool\",\"toolName\":\"tool_name\",\"params\":{},\"reason\":\"short reason\"}",
            "Final answer: {\"action\":\"final\",\"response\":\"short answer\"}",
          ].join("\n"),
        },
      ],
      schema: loopDecisionSchema(),
    }));
  }
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
  return [...prerequisiteReads, ...required];
}

function unmetRequiredTools(
  requiredTools: AgentPlanTool[],
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>,
): AgentPlanTool[] {
  const completed = new Set(
    toolCalls
      .filter((toolCall) => toolCall.status === "success")
      .map((toolCall) => toolCall.name),
  );
  return requiredTools.filter((tool) => !completed.has(tool.name));
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
