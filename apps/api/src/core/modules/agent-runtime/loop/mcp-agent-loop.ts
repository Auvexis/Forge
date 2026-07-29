import { randomUUID } from "node:crypto";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "../agent-errors.ts";
import type { AgentRuntimeEvent } from "../agent-runtime-events.ts";
import type { AgentRunResult } from "../agent-types.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import type { AgentRequiredAction, IntentModel } from "../intent/agent-intent-gateway.ts";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { sanitizeAgentToolValue } from "./agent-tool-result-sanitizer.ts";
import type { AgentRuntimeLogger } from "../observability/agent-runtime-logger.ts";
import type { AgentRuntimeStateLifecycle } from "../persistence/agent-runtime-state-store.ts";
import { InternalMcpCallError } from "../mcp/internal-mcp-error.ts";
import { validateAgentActionGraph } from "./agent-action-graph-validator.ts";

interface ActionState extends AgentRequiredAction {
  status: "pending" | "completed";
  callId?: string;
  arguments?: Record<string, unknown>;
  output?: unknown;
}

interface McpLoopResumeState {
  actions: ActionState[];
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>;
  toolCallCount: number;
}

type ArgumentDecision =
  | { action: "call"; arguments: Record<string, unknown> }
  | { action: "clarify"; question: string };

export async function runMcpAgentLoop(input: {
  model: IntentModel & { generateFinalResponse(input: { messages: AgentModelMessage[] }): Promise<string> };
  client: InternalMcpClient;
  systemPrompt: string;
  userMessage: string;
  contextMessages: AgentModelMessage[];
  actions: AgentRequiredAction[];
  maxToolCalls: number;
  maxRetriesPerTool?: number;
  abortSignal?: AbortSignal;
  approvedTool?: {
    toolName: string;
    arguments: Record<string, unknown>;
    resumeState?: unknown;
  };
  resumeState?: unknown;
  emitEvent: (event: AgentRuntimeEvent) => void;
  logger?: AgentRuntimeLogger;
  state?: AgentRuntimeStateLifecycle;
}): Promise<AgentRunResult> {
  throwIfCancelled(input.abortSignal);
  const resumed = normalizeResumeState(input.resumeState ?? input.approvedTool?.resumeState);
  const actions: ActionState[] = resumed?.actions ?? input.actions.map((action) => ({ ...action, status: "pending" }));
  validateAgentActionGraph(actions, input.maxToolCalls);
  const toolCalls = [...(resumed?.toolCalls ?? [])];
  let toolCallCount = resumed?.toolCallCount ?? 0;
  input.state?.initializeActions(actions);

  if (input.approvedTool) {
    const action = nextAction(actions);
    if (!action || action.toolName !== input.approvedTool.toolName) {
      return waitingUser("A ação aprovada não corresponde à próxima etapa pendente.", toolCallCount, toolCalls);
    }
    input.state?.markActionRunning(action.id);
    const result = await executeCall(input, action, input.approvedTool.arguments, toolCallCount + 1, actions, toolCalls);
    action.status = "completed";
    action.callId = result.call.id;
    action.arguments = result.call.arguments;
    action.output = result.content;
    toolCalls.push(result.toolCall);
    toolCallCount += 1;
    input.state?.markActionCompleted(action.id, result.content);
  }

  while (actions.some((action) => action.status === "pending")) {
    throwIfCancelled(input.abortSignal);
    if (toolCallCount >= input.maxToolCalls) {
      return waitingUser("O limite de ferramentas foi atingido antes de concluir todas as ações.", toolCallCount, toolCalls);
    }

    const action = nextAction(actions);
    if (!action) {
      return waitingUser("As ações possuem dependências que não puderam ser resolvidas.", toolCallCount, toolCalls);
    }

    input.emitEvent({
      type: "agent:thinking",
      payload: { message: `Preparing ${action.toolName}`, actionId: action.id },
    } as AgentRuntimeEvent);
    input.logger?.debug("action.preparing", {
      actionId: action.id,
      toolName: action.toolName,
      dependencyCount: action.dependsOn.length,
    });
    const tool = input.client.describeTool(action.toolName);
    const decision = await prepareArguments(input, action, actions, tool);

    if (decision.action === "clarify") {
      input.logger?.info("action.waiting_user", {
        actionId: action.id,
        toolName: action.toolName,
        reason: "missing_arguments",
      });
      input.state?.markActionWaitingUser(action.id);
      persistPending(
        input,
        "clarification",
        decision.question || `More information is required for ${action.objective}.`,
        actions,
        toolCalls,
        toolCallCount,
        action.id,
      );
      return waitingUser(decision.question || `Preciso de mais informações para executar ${action.objective}.`, toolCallCount, toolCalls);
    }

    const arguments_ = isRecord(decision.arguments) ? decision.arguments : {};
    input.state?.markActionRunning(action.id);
    try {
      const result = await executeCall(input, action, arguments_, toolCallCount + 1, actions, toolCalls);
      toolCalls.push(result.toolCall);
      toolCallCount += 1;
      const interruption = classifyInterruption(result.content);
      if (interruption) {
        input.logger?.info("action.waiting_user", {
          actionId: action.id,
          toolName: action.toolName,
          reason: "tool_result",
        });
        input.state?.markActionWaitingUser(action.id, result.content);
        persistPending(
          input,
          "selection",
          interruption,
          actions,
          toolCalls,
          toolCallCount,
          action.id,
          result.content,
        );
        return waitingUser(interruption, toolCallCount, toolCalls);
      }
      action.status = "completed";
      action.callId = result.call.id;
      action.arguments = result.call.arguments;
      action.output = result.content;
      input.state?.markActionCompleted(action.id, result.content);
      input.logger?.info("action.completed", {
        actionId: action.id,
        toolName: action.toolName,
      });
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) {
        input.state?.markActionWaitingApproval(action.id);
        error.approvalRequest.resumeState = {
          actions: sanitizeActionsForResume(actions),
          toolCalls,
          toolCallCount,
        } satisfies McpLoopResumeState;
      } else if (error instanceof InternalMcpCallError && error.mcpError.userActionRequired) {
        const kind = pendingKindFor(error);
        input.state?.markActionWaitingUser(action.id, { error: error.mcpError });
        persistPending(
          input,
          kind,
          error.mcpError.message,
          actions,
          toolCalls,
          toolCallCount,
          action.id,
          { error: error.mcpError },
        );
        input.logger?.info("action.waiting_user", {
          actionId: action.id,
          toolName: action.toolName,
          reason: error.mcpError.category,
        });
        return waitingUser(error.mcpError.message, toolCallCount, toolCalls);
      } else {
        input.state?.markActionFailed(action.id, { error: safeError(error) });
      }
      throw error;
    }
  }

  const output = await input.model.generateFinalResponse({
    messages: [
      {
        role: "system",
        content: [
          input.systemPrompt,
          "All required actions completed. Give the user a concise factual summary.",
          "Do not claim any operation beyond the completed action results.",
        ].join("\n\n"),
      },
      ...input.contextMessages,
      { role: "user", content: input.userMessage },
      ...actionConversationMessages(actions),
      {
        role: "tool",
        name: "fabric_action_results",
        tool_call_id: "fabric_action_results",
        content: JSON.stringify(completedActionContext(actions)),
      },
    ],
  });

  return {
    status: "success",
    output,
    toolCallCount,
    iterationCount: Math.max(1, toolCallCount),
    toolCalls,
  };
}

async function prepareArguments(
  input: Parameters<typeof runMcpAgentLoop>[0],
  action: ActionState,
  actions: ActionState[],
  tool: ReturnType<InternalMcpClient["describeTool"]>,
): Promise<ArgumentDecision> {
  let validationFeedback = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const decision = await input.model.invokeJson<ArgumentDecision>({
      signal: input.abortSignal,
      schema: argumentDecisionSchema(input.client.getToolSchema(action.toolName)),
      messages: [
        {
          role: "system",
          content: [
            input.systemPrompt,
            `Prepare the arguments for exactly one connected tool: ${tool.name}.`,
            `Objective: ${action.objective}`,
            `Tool summary: ${tool.summary}`,
            tool.instructions ? `Tool instructions: ${tool.instructions}` : "",
            "Return call when all required arguments are known.",
            "Return clarify instead of guessing any missing identifier, recipient, file, permission, or destructive intent.",
            "Previous completed action outputs are supplied below. Reuse their stable references when needed.",
            validationFeedback,
          ].filter(Boolean).join("\n\n"),
        },
        ...input.contextMessages,
        { role: "user", content: input.userMessage },
        ...actionConversationMessages(actions),
        {
          role: "tool",
          name: "fabric_action_state",
          tool_call_id: "fabric_action_state",
          content: JSON.stringify(completedActionContext(actions)),
        },
      ],
    });
    if (decision.action === "clarify") return decision;

    const arguments_ = isRecord(decision.arguments) ? decision.arguments : {};
    try {
      input.client.validateToolArguments(action.toolName, arguments_);
      return { action: "call", arguments: arguments_ };
    } catch (error) {
      if (!(error instanceof AgentRuntimeError) || error.code !== "AGENT_TOOL_ARGUMENTS_INVALID") {
        throw error;
      }
      validationFeedback = [
        "The previous arguments did not match the tool schema.",
        error.message,
        "Repair them once. Do not add fields that are not declared in the schema.",
      ].join("\n");
    }
  }
  return {
    action: "clarify",
    question: `Preciso de dados válidos para executar ${action.objective}.`,
  };
}

async function executeCall(
  input: Parameters<typeof runMcpAgentLoop>[0],
  action: ActionState,
  arguments_: Record<string, unknown>,
  sequence: number,
  actions: ActionState[],
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>,
) {
  const tool = input.client.describeTool(action.toolName);
  const call = {
    id: `tool_call_${sequence}_${randomUUID()}`,
    actionId: action.id,
    name: tool.name,
    arguments: arguments_,
  };
  const logger = input.logger?.child({
    actionId: action.id,
    toolCallId: call.id,
    toolName: call.name,
  });
  logger?.debug("tool.call_started", { sequence, arguments: arguments_ });
  input.emitEvent({
    type: "agent:tool-intent",
    payload: { callId: call.id, name: call.name, pluginId: tool.pluginId, actionId: action.id, params: sanitizeAgentToolValue(arguments_) },
  } as AgentRuntimeEvent);
  if (!tool.requiresApproval || input.approvedTool?.toolName === tool.name) {
    input.emitEvent({
      type: "agent:tool-start",
      payload: { callId: call.id, name: call.name, pluginId: tool.pluginId, actionId: action.id },
    } as AgentRuntimeEvent);
  }

  const maxRetries = Math.min(Math.max(0, input.maxRetriesPerTool ?? 0), 3);
  for (let attempt = 0; ; attempt += 1) {
    try {
      const result = await withAbort(input.client.callTool(call), input.abortSignal);
      logger?.info("tool.call_completed", { sequence, attempt, result: result.content });
      input.emitEvent({
        type: "agent:tool-end",
        payload: { callId: call.id, name: call.name, pluginId: tool.pluginId, status: "success", output: sanitizeAgentToolValue(result.content) },
      } as AgentRuntimeEvent);
      return result;
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) {
        error.approvalRequest.resumeState = {
          actions: sanitizeActionsForResume(actions),
          toolCalls,
          toolCallCount: sequence - 1,
        } satisfies McpLoopResumeState;
        throw error;
      }
      if (error instanceof InternalMcpCallError && error.mcpError.retryable && attempt < maxRetries) {
        const delayMs = retryDelayMs(attempt);
        logger?.warn("tool.call_failed", {
          sequence,
          attempt,
          category: error.mcpError.category,
          retryInMs: delayMs,
        });
        input.emitEvent({
          type: "agent:tool-retry",
          payload: { callId: call.id, name: call.name, attempt: attempt + 1, delayMs },
        } as AgentRuntimeEvent);
        await waitForRetry(delayMs, input.abortSignal);
        continue;
      }
      logger?.error("tool.call_failed", { sequence, attempt, error: safeError(error) });
      input.emitEvent({
        type: "agent:tool-end",
        payload: { callId: call.id, name: call.name, pluginId: tool.pluginId, status: "failed", error: safeError(error) },
      } as AgentRuntimeEvent);
      throw error;
    }
  }
}

function nextAction(actions: ActionState[]): ActionState | undefined {
  const completed = new Set(actions.filter((action) => action.status === "completed").map((action) => action.id));
  return actions.find((action) =>
    action.status === "pending" && action.dependsOn.every((dependency) => completed.has(dependency))
  );
}

function completedActionContext(actions: ActionState[]) {
  return actions
    .filter((action) => action.status === "completed")
    .map((action) => ({
      id: action.id,
      toolName: action.toolName,
      objective: action.objective,
      output: sanitizeAgentToolValue(action.output),
    }));
}

function actionConversationMessages(actions: ActionState[]): AgentModelMessage[] {
  return actions
    .filter((action) =>
      action.status === "completed" &&
      typeof action.callId === "string" &&
      action.arguments !== undefined
    )
    .flatMap((action) => [
      {
        role: "assistant" as const,
        content: "",
        tool_calls: [{
          id: action.callId!,
          name: action.toolName,
          arguments: action.arguments!,
        }],
      },
      {
        role: "tool" as const,
        name: action.toolName,
        tool_call_id: action.callId,
        content: JSON.stringify(sanitizeAgentToolValue(action.output)),
      },
    ]);
}

function classifyInterruption(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const status = String(value.status ?? value.result ?? "").toLowerCase();
  if (status === "multiple_matches" || status === "ambiguous" || status === "waiting-user") {
    return typeof value.question === "string"
      ? value.question
      : "Encontrei mais de um resultado possível. Qual deles devo usar?";
  }
  if (status === "not_found") {
    return typeof value.question === "string"
      ? value.question
      : "Não encontrei o item solicitado. Você pode informar outro nome ou mais detalhes?";
  }
  return null;
}

function persistPending(
  input: Parameters<typeof runMcpAgentLoop>[0],
  kind: "clarification" | "selection" | "authentication" | "permission",
  question: string,
  actions: ActionState[],
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>,
  toolCallCount: number,
  actionId?: string,
  interruptedOutput?: unknown,
): void {
  input.state?.createPendingInteraction({
    id: `interaction_${randomUUID()}`,
    actionId,
    kind,
    question,
    context: {
      source: "loop",
      originalUserMessage: input.userMessage,
      resumeState: {
        actions: sanitizeActionsForResume(actions),
        toolCalls,
        toolCallCount,
      } satisfies McpLoopResumeState,
      ...(interruptedOutput !== undefined
        ? { interruptedOutput: sanitizeAgentToolValue(interruptedOutput) }
        : {}),
    },
  });
}

function waitingUser(
  question: string,
  toolCallCount: number,
  toolCalls: NonNullable<AgentRunResult["toolCalls"]>,
): AgentRunResult {
  return {
    status: "waiting-user",
    output: { status: "waiting-user", question },
    toolCallCount,
    iterationCount: Math.max(1, toolCallCount),
    toolCalls,
  };
}

function argumentDecisionSchema(inputSchema: Record<string, any>): Record<string, any> {
  return {
    type: "object",
    required: ["action"],
    additionalProperties: false,
    properties: {
      action: { enum: ["call", "clarify"] },
      arguments: inputSchema,
      question: { type: "string" },
    },
  };
}

function normalizeResumeState(value: unknown): McpLoopResumeState | null {
  if (!isRecord(value) || !Array.isArray(value.actions) || !Array.isArray(value.toolCalls)) return null;
  return {
    actions: value.actions.filter(isRecord).map((action) => ({
      id: String(action.id ?? ""),
      toolName: String(action.toolName ?? ""),
      objective: String(action.objective ?? ""),
      dependsOn: Array.isArray(action.dependsOn) ? action.dependsOn.map(String) : [],
      status: action.status === "completed" ? "completed" : "pending",
      ...(typeof action.callId === "string" ? { callId: action.callId } : {}),
      ...(isRecord(action.arguments) ? { arguments: action.arguments } : {}),
      ...(action.output !== undefined ? { output: action.output } : {}),
    })),
    toolCalls: value.toolCalls as NonNullable<AgentRunResult["toolCalls"]>,
    toolCallCount: Number.isSafeInteger(value.toolCallCount) ? Number(value.toolCallCount) : 0,
  };
}

function sanitizeActionsForResume(actions: ActionState[]): ActionState[] {
  return actions.map((action) => ({
    ...action,
    ...(action.output !== undefined ? { output: sanitizeAgentToolValue(action.output) } : {}),
  }));
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw signal.reason ?? new AgentRuntimeError(
    "Agent run was cancelled",
    "AGENT_RUN_CANCELLED",
    "Agent execution was cancelled",
    499,
  );
}

function pendingKindFor(
  error: InternalMcpCallError,
): "clarification" | "selection" | "authentication" | "permission" {
  if (error.mcpError.category === "ambiguous") return "selection";
  if (error.mcpError.category === "authentication") return "authentication";
  if (error.mcpError.category === "permission") return "permission";
  return "clarification";
}

function retryDelayMs(attempt: number): number {
  return Math.min(1_000, 100 * (2 ** attempt));
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new Error("Agent run cancelled"));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(signal.reason ?? new Error("Agent run cancelled"));
    }, { once: true });
  });
}

async function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) throw signal.reason ?? new Error("Agent run cancelled");
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        onAbort = () => reject(signal.reason ?? new Error("Agent run cancelled"));
        signal.addEventListener("abort", onAbort, { once: true });
      }),
    ]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
    promise.catch(() => undefined);
  }
}
