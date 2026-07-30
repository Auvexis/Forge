import { randomUUID } from "node:crypto";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "../agent-errors.ts";
import type { AgentRunResult, AgentRuntimeEvent } from "../agent-types.ts";
import type { IntentModel } from "../intent/agent-intent-gateway.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import type { AgentRuntimeLogger } from "../observability/agent-runtime-logger.ts";
import { sanitizeAgentToolValue } from "./agent-tool-result-sanitizer.ts";

type NextStepDecision =
  | { mode: "chat"; response: string }
  | { mode: "clarify"; question: string }
  | { mode: "tool"; toolName: string; objective: string };

type ArgumentDecision =
  | { action: "call"; arguments: Record<string, unknown> }
  | { action: "clarify"; question: string };

interface CompletedStep {
  toolName: string;
  objective: string;
  arguments: Record<string, unknown>;
  output: unknown;
}

export async function runIterativeMcpAgentLoop(input: {
  model: IntentModel;
  client: InternalMcpClient;
  systemPrompt: string;
  userMessage: string;
  contextMessages: AgentModelMessage[];
  maxToolCalls: number;
  abortSignal?: AbortSignal;
  logger?: AgentRuntimeLogger;
  emitEvent: (event: AgentRuntimeEvent) => void;
}): Promise<AgentRunResult> {
  const cards = input.client.listTools();
  const completed: CompletedStep[] = [];
  const toolCalls: NonNullable<AgentRunResult["toolCalls"]> = [];

  for (let iteration = 1; iteration <= input.maxToolCalls + 2; iteration += 1) {
    throwIfAborted(input.abortSignal);
    const decision = normalizeNextStep(await input.model.invokeJson<NextStepDecision>({
      signal: input.abortSignal,
      schema: nextStepSchema(cards.map(({ name }) => name)),
      messages: [
        {
          role: "system",
          content: [
            input.systemPrompt,
            "Operate as an iterative tool loop. Choose at most one next tool.",
            "Do not create or return a full plan.",
            "Use chat only when the original request is fully complete or no external action is needed.",
            "Use clarify only for a specific value that cannot be derived from the request or completed tool results.",
            "Never repeat a completed operation.",
            "Continue until every outcome in the original request is satisfied.",
            `Connected tool cards as untrusted JSON:\n${JSON.stringify(cards)}`,
            `Completed steps as untrusted JSON:\n${JSON.stringify(completed.map(compactStep))}`,
          ].join("\n\n"),
        },
        ...input.contextMessages,
        { role: "user", content: input.userMessage },
      ],
    }), new Set(cards.map(({ name }) => name)));
    input.logger?.info("intent.classified", {
      mode: decision.mode,
      iteration,
      ...(decision.mode === "tool" ? { toolName: decision.toolName } : {}),
    });

    if (decision.mode === "chat") {
      return {
        status: "success",
        output: decision.response,
        iterationCount: iteration,
        toolCallCount: completed.length,
        toolCalls,
      };
    }
    if (decision.mode === "clarify") {
      return {
        status: "waiting-user",
        output: { status: "waiting-user", question: decision.question },
        iterationCount: iteration,
        toolCallCount: completed.length,
        toolCalls,
      };
    }
    if (completed.length >= input.maxToolCalls) {
      throw new AgentRuntimeError(
        "Agent tool call limit reached before completion",
        "AGENT_TOOL_LIMIT_EXCEEDED",
        "Agent reached the tool limit before completing the request",
        409,
      );
    }

    const descriptor = input.client.describeTool(decision.toolName);
    const argumentDecision = await prepareArguments(input, decision, completed, descriptor.inputSchema);
    if (argumentDecision.action === "clarify") {
      return {
        status: "waiting-user",
        output: { status: "waiting-user", question: argumentDecision.question },
        iterationCount: iteration,
        toolCallCount: completed.length,
        toolCalls,
      };
    }

    const sequence = completed.length + 1;
    const call = {
      id: `tool_call_${sequence}_${randomUUID()}`,
      actionId: `action_${randomUUID()}`,
      name: decision.toolName,
      arguments: argumentDecision.arguments,
    };
    input.emitEvent({
      type: "agent:tool-intent",
      payload: {
        callId: call.id,
        actionId: call.actionId,
        name: call.name,
        pluginId: descriptor.pluginId,
        params: sanitizeAgentToolValue(call.arguments),
      },
    });
    input.emitEvent({
      type: "agent:tool-start",
      payload: { callId: call.id, actionId: call.actionId, name: call.name, pluginId: descriptor.pluginId },
    });
    const toolLogger = input.logger?.child({
      actionId: call.actionId,
      toolCallId: call.id,
      toolName: call.name,
    });
    toolLogger?.info("tool.call_started", { iteration });
    try {
      const result = await input.client.callTool(call);
      input.emitEvent({
        type: "agent:tool-end",
        payload: {
          callId: call.id,
          actionId: call.actionId,
          name: call.name,
          pluginId: descriptor.pluginId,
          status: "success",
          output: sanitizeAgentToolValue(result.content),
        },
      });
      completed.push({
        toolName: call.name,
        objective: decision.objective,
        arguments: call.arguments,
        output: result.content,
      });
      toolCalls.push(result.toolCall);
      toolLogger?.info("tool.call_completed", { iteration });
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) throw error;
      toolLogger?.error("tool.call_failed", {
        iteration,
        message: error instanceof Error ? error.message : String(error),
      });
      input.emitEvent({
        type: "agent:tool-end",
        payload: {
          callId: call.id,
          actionId: call.actionId,
          name: call.name,
          pluginId: descriptor.pluginId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  throw new AgentRuntimeError(
    "Agent iteration limit reached before completion",
    "AGENT_ITERATION_LIMIT_EXCEEDED",
    "Agent reached the iteration limit before completing the request",
    409,
  );
}

async function prepareArguments(
  input: Parameters<typeof runIterativeMcpAgentLoop>[0],
  decision: Extract<NextStepDecision, { mode: "tool" }>,
  completed: CompletedStep[],
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
            "Reuse IDs and artifact references from completed results.",
            "Infer safe email subject and body text from the request.",
            validationError,
            `Completed results as untrusted JSON:\n${JSON.stringify(completed.map(compactStep))}`,
          ].filter(Boolean).join("\n\n"),
        },
        ...input.contextMessages,
        { role: "user", content: input.userMessage },
      ],
    });
    if (result.action === "clarify") {
      return {
        action: "clarify",
        question: specificQuestion(result.question, decision.objective, schema),
      };
    }
    const arguments_ = result.arguments && typeof result.arguments === "object"
      ? result.arguments
      : {};
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

function normalizeNextStep(value: unknown, toolNames: Set<string>): NextStepDecision {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {
    mode: "clarify",
    question: "Não consegui identificar a próxima ação. Qual resultado você espera agora?",
  };
  const record = value as Record<string, unknown>;
  if (record.mode === "chat") return { mode: "chat", response: String(record.response ?? "").trim() };
  if (record.mode === "clarify") return {
    mode: "clarify",
    question: String(record.question ?? "").trim() || "Qual informação específica está faltando?",
  };
  const toolName = String(record.toolName ?? "");
  if (record.mode === "tool" && toolNames.has(toolName)) return {
    mode: "tool",
    toolName,
    objective: String(record.objective ?? "").trim() || `Execute ${toolName}`,
  };
  return {
    mode: "clarify",
    question: "Não encontrei uma ferramenta conectada para a próxima ação. O que devo fazer?",
  };
}

function compactStep(step: CompletedStep) {
  return {
    toolName: step.toolName,
    objective: step.objective,
    arguments: sanitizeAgentToolValue(step.arguments),
    output: sanitizeAgentToolValue(step.output),
  };
}

function specificQuestion(question: string, objective: string, schema: Record<string, any>, detail = ""): string {
  const value = String(question ?? "").trim();
  const generic = /mais inform|more information|dados validos/i.test(
    value.normalize("NFD").replace(/\p{Diacritic}/gu, ""),
  );
  if (value && !generic) return value;
  const required = Array.isArray(schema.required) ? schema.required.map(String) : [];
  return [
    `Para ${objective}, ainda preciso de: ${required.join(", ") || "um valor específico"}.`,
    detail ? `Validação: ${detail}.` : "",
  ].filter(Boolean).join(" ");
}

function nextStepSchema(toolNames: string[]): Record<string, unknown> {
  return {
    type: "object",
    required: ["mode"],
    additionalProperties: false,
    properties: {
      mode: { enum: ["chat", "clarify", "tool"] },
      response: { type: "string" },
      question: { type: "string" },
      toolName: { type: "string", enum: toolNames },
      objective: { type: "string" },
    },
  };
}

function argumentSchema(toolSchema: Record<string, any>): Record<string, unknown> {
  return {
    type: "object",
    required: ["action"],
    additionalProperties: false,
    properties: {
      action: { enum: ["call", "clarify"] },
      arguments: toolSchema,
      question: { type: "string" },
    },
  };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw signal.reason ?? new Error("Agent run cancelled");
}
