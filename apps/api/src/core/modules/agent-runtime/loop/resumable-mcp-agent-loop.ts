import { randomUUID } from "node:crypto";
import type { AgentEngineToolRequest } from "../engine-protocol/agent-engine-request.ts";
import type { AgentEngineResponse } from "../engine-protocol/agent-engine-response.ts";
import type { AgentInteractionKind } from "../engine-protocol/agent-interaction-contract.ts";
import { AgentRuntimeError } from "../agent-errors.ts";
import type { IntentModel } from "../intent/agent-intent-gateway.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import type { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { sanitizeAgentToolValue } from "./agent-tool-result-sanitizer.ts";
import type { AgentRuntimeLogger } from "../observability/agent-runtime-logger.ts";
import {
  buildCanonicalScratchpad,
  conversationWithoutToolHistory,
  reconstructScratchpadSteps,
} from "./canonical-agent-scratchpad.ts";

type NextStepDecision =
  | { mode: "chat"; response: string }
  | { mode: "clarify"; question: string }
  | { mode: "tool"; toolName: string; objective: string };

type ArgumentDecision =
  | { action: "call"; arguments: Record<string, unknown> }
  | { action: "clarify"; question: string };

export interface ResumableMcpCompletedStep {
  toolName: string;
  objective: string;
  arguments: Record<string, unknown>;
  output: unknown;
  toolCallId: string;
}

export interface ResumableMcpLoopState {
  iterationCount: number;
  toolCallCount: number;
  completed: ResumableMcpCompletedStep[];
  rejectedDuplicates: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    previousOutput: unknown;
  }>;
  pendingRequest?: AgentEngineToolRequest;
}

export type ResumableMcpLoopStep =
  | { type: "request"; request: AgentEngineToolRequest; state: ResumableMcpLoopState }
  | { type: "final"; response: string; state: ResumableMcpLoopState }
  | {
      type: "interaction";
      kind: AgentInteractionKind;
      question: string;
      options?: Array<{ value: string; label: string; description?: string }>;
      context: Record<string, unknown>;
      state: ResumableMcpLoopState;
    };

export function createResumableMcpLoopState(
  contextMessages: AgentModelMessage[] = [],
): ResumableMcpLoopState {
  return {
    iterationCount: 0,
    toolCallCount: 0,
    completed: reconstructScratchpadSteps(contextMessages).map((step) => ({
      ...step,
      objective: `Previously completed ${step.toolName}`,
    })),
    rejectedDuplicates: [],
  };
}

export async function advanceResumableMcpAgentLoop(input: {
  runId: string;
  model: IntentModel;
  client: Pick<InternalMcpClient, "listTools" | "describeTool" | "validateToolArguments">;
  systemPrompt: string;
  userMessage: string;
  contextMessages: AgentModelMessage[];
  state: ResumableMcpLoopState;
  response?: AgentEngineResponse;
  approvedTool?: {
    toolName: string;
    arguments: Record<string, unknown>;
  };
  maxIterations: number;
  maxToolCalls: number;
  abortSignal?: AbortSignal;
  logger?: AgentRuntimeLogger;
}): Promise<ResumableMcpLoopStep> {
  throwIfAborted(input.abortSignal);
  let state = cloneState(input.state);
  const consumed = consumeResponse(state, input.response);
  state = consumed.state;
  if (consumed.interaction) {
    return { type: "interaction", ...consumed.interaction, state };
  }
  if (state.pendingRequest) {
    throw new AgentRuntimeError(
      "Agent is waiting for its pending engine response",
      "AGENT_ENGINE_RESPONSE_PENDING",
      "Agent is waiting for a tool result",
      409,
    );
  }
  if (input.approvedTool) {
    if (state.toolCallCount >= input.maxToolCalls) throw limitError("tool");
    const descriptor = input.client.describeTool(input.approvedTool.toolName);
    const now = new Date().toISOString();
    const toolCallId = `tool_call_${state.toolCallCount + 1}_${randomUUID()}`;
    const request: AgentEngineToolRequest = {
      kind: "tool",
      id: `engine_request_${randomUUID()}`,
      idempotencyKey: `${input.runId}:${toolCallId}`,
      runId: input.runId,
      iteration: state.iterationCount + 1,
      toolCallId,
      actionId: `action_${randomUUID()}`,
      toolName: input.approvedTool.toolName,
      pluginId: descriptor.pluginId,
      arguments: input.approvedTool.arguments,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };
    state.iterationCount += 1;
    state.toolCallCount += 1;
    state.pendingRequest = request;
    return { type: "request", request, state };
  }
  if (state.iterationCount >= input.maxIterations) {
    throw limitError("iteration");
  }

  state.iterationCount += 1;
  const decisionStartedAt = performance.now();
  const cards = input.client.listTools();
  let decision = normalizeNextStep(await input.model.invokeJson<NextStepDecision>({
    signal: input.abortSignal,
    schema: nextStepSchema(cards.map(({ name }) => name)),
    messages: decisionMessages(input, state, cards),
  }), new Set(cards.map(({ name }) => name)));
  input.logger?.info("decision.completed", {
    iteration: state.iterationCount,
    mode: decision.mode,
    durationMs: Math.round(performance.now() - decisionStartedAt),
    ...(decision.mode === "tool" ? { toolName: decision.toolName } : {}),
  });

  if (decision.mode === "chat") {
    const pendingTools = pendingRequestedToolNames(input.userMessage, cards, state);
    if (pendingTools.length > 0) {
      decision = {
        mode: "tool",
        toolName: pendingTools[0]!,
        objective: `Complete the pending requested operation with ${pendingTools[0]}`,
      };
      input.logger?.warn("decision.completed", {
        iteration: state.iterationCount,
        mode: decision.mode,
        prematureFinalRejected: true,
        pendingTools,
      });
    }
  }

  if (decision.mode === "chat") {
    if (state.toolCallCount > 0 && !decision.response.trim()) {
      throw new AgentRuntimeError(
        "Agent returned an empty completion after tool execution",
        "AGENT_COMPLETION_INVALID",
        "Agent did not provide a final response",
        409,
      );
    }
    return { type: "final", response: decision.response, state };
  }
  if (decision.mode === "clarify") {
    return {
      type: "interaction",
      kind: "clarification",
      question: decision.question,
      context: { source: "model-decision" },
      state,
    };
  }
  if (state.toolCallCount >= input.maxToolCalls) {
    throw limitError("tool");
  }

  const descriptor = input.client.describeTool(decision.toolName);
  const argumentDecision = await prepareArguments(input, state, decision, descriptor.inputSchema);
  if (argumentDecision.action === "clarify") {
    return {
      type: "interaction",
      kind: "clarification",
      question: argumentDecision.question,
      context: { source: "tool-arguments", toolName: decision.toolName },
      state,
    };
  }

  const duplicate = state.completed.find((step) =>
    step.toolName === decision.toolName &&
    stableStringify(step.arguments) === stableStringify(argumentDecision.arguments)
  );
  if (duplicate) {
    state.rejectedDuplicates.push({
      toolName: decision.toolName,
      arguments: argumentDecision.arguments,
      previousOutput: sanitizeAgentToolValue(duplicate.output),
    });
    return {
      type: "interaction",
      kind: "clarification",
      question: duplicateQuestion(duplicate),
      context: { source: "repetition-guard", toolName: duplicate.toolName },
      state,
    };
  }

  const now = new Date().toISOString();
  const toolCallId = `tool_call_${state.toolCallCount + 1}_${randomUUID()}`;
  const request: AgentEngineToolRequest = {
    kind: "tool",
    id: `engine_request_${randomUUID()}`,
    idempotencyKey: `${input.runId}:${toolCallId}`,
    runId: input.runId,
    iteration: state.iterationCount,
    toolCallId,
    actionId: `action_${randomUUID()}`,
    toolName: decision.toolName,
    pluginId: descriptor.pluginId,
    arguments: argumentDecision.arguments,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
  state.toolCallCount += 1;
  state.pendingRequest = request;
  return { type: "request", request, state };
}

function consumeResponse(
  state: ResumableMcpLoopState,
  response?: AgentEngineResponse,
): {
  state: ResumableMcpLoopState;
  interaction?: {
    kind: AgentInteractionKind;
    question: string;
    options?: Array<{ value: string; label: string; description?: string }>;
    context: Record<string, unknown>;
  };
} {
  if (!response) return { state };
  const pending = state.pendingRequest;
  if (!pending && state.completed.some((step) => step.toolCallId === response.toolCallId)) {
    throw new AgentRuntimeError(
      "Engine response was already consumed",
      "AGENT_ENGINE_RESPONSE_DUPLICATE",
      "Duplicate tool response was ignored",
      409,
    );
  }
  if (!pending || response.requestId !== pending.id || response.toolCallId !== pending.toolCallId) {
    throw new AgentRuntimeError(
      "Engine response does not match the pending request",
      "AGENT_ENGINE_RESPONSE_MISMATCH",
      "Tool response correlation failed",
      409,
    );
  }
  if (response.status === "cancelled") {
    throw new AgentRuntimeError(
      response.reason ?? "Agent tool request was cancelled",
      "AGENT_TOOL_CANCELLED",
      "Tool execution was cancelled",
      409,
    );
  }
  if (response.status === "failed" && response.error.userActionRequired) {
    const kind = interactionKindForError(response.error);
    delete state.pendingRequest;
    return {
      state,
      interaction: {
        kind,
        question: interactionQuestion(kind, response.error.message),
        ...(interactionOptions(response.error.details) ? {
          options: interactionOptions(response.error.details),
        } : {}),
        context: {
          source: "tool-error",
          requestId: response.requestId,
          toolCallId: response.toolCallId,
          toolName: pending.toolName,
          toolArguments: pending.arguments,
          error: response.error,
        },
      },
    };
  }
  if (response.status === "failed") {
    throw new AgentRuntimeError(
      response.error.message,
      response.error.code,
      response.error.message,
      response.error.retryable ? 503 : 409,
    );
  }
  state.completed.push({
    toolName: pending.toolName,
    objective: `Complete ${pending.toolName}`,
    arguments: pending.arguments,
    output: response.output,
    toolCallId: pending.toolCallId,
  });
  delete state.pendingRequest;
  const ambiguousOptions = resultSelectionOptions(response.output);
  if (ambiguousOptions) {
    return {
      state,
      interaction: {
        kind: "selection",
        question: "More than one matching result was found. Choose which one to use.",
        options: ambiguousOptions,
        context: {
          source: "ambiguous-tool-result",
          toolName: pending.toolName,
        },
      },
    };
  }
  if (isEmptyToolResult(response.output) && /(list|search|find|buscar|listar)/i.test(pending.toolName)) {
    return {
      state,
      interaction: {
        kind: "clarification",
        question: [
          `The ${pending.toolName} tool found no results.`,
          "Provide part of the name, extension, folder, or another criterion to retry the search.",
        ].join(" "),
        context: {
          source: "empty-tool-result",
          toolName: pending.toolName,
          previousArguments: pending.arguments,
        },
      },
    };
  }
  return { state };
}

function resultSelectionOptions(
  value: unknown,
): Array<{ value: string; label: string; description?: string }> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (record.ambiguous !== true || !Array.isArray(record.options)) return undefined;
  return interactionOptions({ options: record.options });
}

function isEmptyToolResult(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["items", "files", "results", "data"]
    .some((key) => Array.isArray(record[key]) && (record[key] as unknown[]).length === 0);
}

function interactionOptions(
  details?: Record<string, unknown>,
): Array<{ value: string; label: string; description?: string }> | undefined {
  if (!Array.isArray(details?.options)) return undefined;
  const options = details.options.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const option = value as Record<string, unknown>;
    if (typeof option.value !== "string" || typeof option.label !== "string") return [];
    return [{
      value: option.value,
      label: option.label,
      ...(typeof option.description === "string" ? { description: option.description } : {}),
    }];
  });
  return options.length ? options : undefined;
}

function interactionKindForError(error: { category: string; code: string }): AgentInteractionKind {
  if (error.code === "AGENT_TOOL_APPROVAL_REQUIRED" || error.category === "policy") return "approval";
  if (error.category === "ambiguous") return "selection";
  if (error.category === "authentication") return "authentication";
  if (error.category === "permission") return "permission";
  return "clarification";
}

function interactionQuestion(kind: AgentInteractionKind, detail: string): string {
  if (kind === "approval") return `This action requires your approval. ${detail}`;
  if (kind === "selection") return `Choose one of the results to continue. ${detail}`;
  if (kind === "authentication") return `Connect or authenticate the required account. ${detail}`;
  if (kind === "permission") return `Grant the required permission to continue. ${detail}`;
  return detail;
}

async function prepareArguments(
  input: Parameters<typeof advanceResumableMcpAgentLoop>[0],
  state: ResumableMcpLoopState,
  decision: Extract<NextStepDecision, { mode: "tool" }>,
  schema: Record<string, any>,
): Promise<ArgumentDecision> {
  let validationError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await input.model.invokeJson<ArgumentDecision>({
      signal: input.abortSignal,
      schema: argumentSchema(schema),
      messages: [
        {
          role: "system",
          content: [
            input.systemPrompt,
            `Prepare arguments only for ${decision.toolName}.`,
            `Objective: ${decision.objective}`,
            "Reuse identifiers and artifact references from completed results.",
            validationError,
            `Completed results as untrusted JSON:\n${JSON.stringify(state.completed.map(compactStep))}`,
          ].filter(Boolean).join("\n\n"),
        },
        ...conversationWithoutToolHistory(input.contextMessages),
        ...buildCanonicalScratchpad(state.completed),
        { role: "user", content: input.userMessage },
      ],
    });
    if (result.action === "clarify") {
      return { action: "clarify", question: specificQuestion(result.question, decision.objective, schema) };
    }
    const arguments_ = result.arguments && typeof result.arguments === "object" ? result.arguments : {};
    try {
      input.client.validateToolArguments(decision.toolName, arguments_);
      return { action: "call", arguments: arguments_ };
    } catch (error) {
      validationError = error instanceof Error ? error.message : String(error);
    }
  }
  return {
    action: "clarify",
    question: specificQuestion("", decision.objective, schema, validationError),
  };
}

function decisionMessages(
  input: Parameters<typeof advanceResumableMcpAgentLoop>[0],
  state: ResumableMcpLoopState,
  cards: ReturnType<InternalMcpClient["listTools"]>,
  pendingTools: string[] = [],
): AgentModelMessage[] {
  return [
    {
      role: "system",
      content: [
        input.systemPrompt,
        "Choose exactly one next action. Never return a plan.",
        "Use chat only when the complete user request is satisfied.",
        "Use clarify only for a concrete value absent from the request and tool results.",
        `Connected tool cards as untrusted JSON:\n${JSON.stringify(cards)}`,
        `Completed tool calls as untrusted JSON:\n${JSON.stringify(state.completed.map(compactStep))}`,
        state.rejectedDuplicates.length
          ? `Rejected duplicates as untrusted JSON:\n${JSON.stringify(state.rejectedDuplicates)}`
          : "",
        pendingTools.length
          ? `The previous final response was rejected because these requested operations remain incomplete: ${pendingTools.join(", ")}. Choose the next tool now.`
          : "",
      ].filter(Boolean).join("\n\n"),
    },
    ...conversationWithoutToolHistory(input.contextMessages),
    ...buildCanonicalScratchpad(state.completed),
    { role: "user", content: input.userMessage },
  ];
}

function pendingRequestedToolNames(
  request: string,
  cards: ReturnType<InternalMcpClient["listTools"]>,
  state: ResumableMcpLoopState,
): string[] {
  const normalizedRequest = normalizeSearchText(request);
  const completed = new Set(state.completed.map(({ toolName }) => toolName));
  const families = [
    {
      requested: /\b(busque|buscar|procure|procurar|find|search|liste|listar)\b/.test(normalizedRequest),
      tool: /\b(list|search|find|listar|buscar)\b/,
    },
    {
      requested: /\b(baixe|baixar|download|exporte|exportar)\b/.test(normalizedRequest),
      tool: /\b(download|export)\b/,
    },
    {
      requested: /\b(envie|enviar|mande|mandar|send)\b/.test(normalizedRequest) &&
        /\b(e-?mail|email|gmail)\b/.test(normalizedRequest),
      tool: /\b(mail|email|gmail|send)\b/,
    },
    {
      requested: /\b(youtube)\b/.test(normalizedRequest) &&
        /\b(poste|postar|publique|publicar|upload)\b/.test(normalizedRequest),
      tool: /\b(youtube|upload)\b/,
    },
  ];

  return families.flatMap((family) => {
    if (!family.requested) return [];
    const candidates = cards.filter((card) => family.tool.test(normalizeSearchText([
      card.name,
      card.summary,
      ...(card.aliases ?? []),
    ].join(" "))));
    if (candidates.length === 0 || candidates.some(({ name }) => completed.has(name))) return [];
    return [candidates[0]!.name];
  });
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[_:.-]+/g, " ");
}

function cloneState(state: ResumableMcpLoopState): ResumableMcpLoopState {
  return {
    ...state,
    completed: state.completed.map((step) => ({ ...step, arguments: { ...step.arguments } })),
    rejectedDuplicates: state.rejectedDuplicates.map((item) => ({
      ...item,
      arguments: { ...item.arguments },
    })),
    pendingRequest: state.pendingRequest
      ? { ...state.pendingRequest, arguments: { ...state.pendingRequest.arguments } }
      : undefined,
  };
}

function normalizeNextStep(value: unknown, toolNames: Set<string>): NextStepDecision {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { mode: "clarify", question: "What specific result do you expect now?" };
  }
  const record = value as Record<string, unknown>;
  if (record.mode === "chat") return { mode: "chat", response: String(record.response ?? "").trim() };
  if (record.mode === "clarify") {
    return {
      mode: "clarify",
      question: String(record.question ?? "").trim() || "What specific information is missing?",
    };
  }
  const toolName = String(record.toolName ?? "");
  if (record.mode === "tool" && toolNames.has(toolName)) {
    return {
      mode: "tool",
      toolName,
      objective: String(record.objective ?? "").trim() || `Execute ${toolName}`,
    };
  }
  return { mode: "clarify", question: "What action should I perform with the connected tools?" };
}

function compactStep(step: ResumableMcpCompletedStep) {
  return {
    toolName: step.toolName,
    objective: step.objective,
    arguments: sanitizeAgentToolValue(step.arguments),
    output: sanitizeAgentToolValue(step.output),
  };
}

function duplicateQuestion(step: ResumableMcpCompletedStep): string {
  return `The ${step.toolName} operation already completed with these parameters. Explain what should change before continuing.`;
}

function specificQuestion(question: string, objective: string, schema: Record<string, any>, detail = ""): string {
  const value = String(question ?? "").trim();
  if (value) return value;
  const required = Array.isArray(schema.required) ? schema.required.map(String) : [];
  return [
    `To ${objective}, I need: ${required.join(", ") || "a specific value"}.`,
    detail ? `Validation: ${detail}.` : "",
  ].filter(Boolean).join(" ");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

function limitError(kind: "iteration" | "tool"): AgentRuntimeError {
  return kind === "iteration"
    ? new AgentRuntimeError(
      "Agent iteration limit reached before completion",
      "AGENT_ITERATION_LIMIT_EXCEEDED",
      "Agent reached the iteration limit before completing the request",
      409,
    )
    : new AgentRuntimeError(
      "Agent tool call limit reached before completion",
      "AGENT_TOOL_LIMIT_EXCEEDED",
      "Agent reached the tool limit before completing the request",
      409,
    );
}

function nextStepSchema(toolNames: string[]): Record<string, unknown> {
  const variants: Record<string, unknown>[] = [
    {
      required: ["mode", "response"],
      additionalProperties: false,
      properties: {
        mode: { const: "chat" },
        response: { type: "string", minLength: 1 },
      },
    },
    {
      required: ["mode", "question"],
      additionalProperties: false,
      properties: {
        mode: { const: "clarify" },
        question: { type: "string", minLength: 1 },
      },
    },
  ];
  if (toolNames.length > 0) {
    variants.push({
      required: ["mode", "toolName", "objective"],
      additionalProperties: false,
      properties: {
        mode: { const: "tool" },
        toolName: { type: "string", enum: toolNames },
        objective: { type: "string", minLength: 1 },
      },
    });
  }
  return {
    type: "object",
    oneOf: variants,
  };
}

function argumentSchema(toolSchema: Record<string, any>): Record<string, unknown> {
  return {
    type: "object",
    oneOf: [
      {
        required: ["action", "arguments"],
        additionalProperties: false,
        properties: {
          action: { const: "call" },
          arguments: toolSchema,
        },
      },
      {
        required: ["action", "question"],
        additionalProperties: false,
        properties: {
          action: { const: "clarify" },
          question: { type: "string", minLength: 1 },
        },
      },
    ],
  };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw signal.reason ?? new Error("Agent run cancelled");
}
