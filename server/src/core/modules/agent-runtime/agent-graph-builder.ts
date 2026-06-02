import { Ajv } from "ajv/dist/ajv.js";
import { AgentBinaryRefStore } from "./agent-binary-ref-store.ts";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "./agent-errors.ts";
import { AGENT_LIMITS } from "./agent-limits.ts";
import type {
  AgentEventType,
  AgentRunResult,
  AgentRunToolCall,
  AiAgentNodeConfig,
  AiMemoryNodeConfig,
} from "./agent-types.ts";

export interface BuildAgentGraphInput {
  agent: AiAgentNodeConfig;
  model: unknown;
  tools: unknown[];
  memory?: AiMemoryNodeConfig;
  checkpointer?: unknown;
  approvalToken?: string;
  skipFinalResponseAfterToolUse?: boolean;
  onEvent?: (event: AgentGraphEvent) => void;
}

export interface AgentGraphInvokeInput {
  userMessage: string;
  sessionId?: string;
  contextMessages?: AgentGraphMessage[];
}

export interface AgentGraph {
  checkpointer?: unknown;
  invoke(input: AgentGraphInvokeInput): Promise<AgentRunResult>;
}

export interface AgentGraphEvent {
  type: AgentEventType;
  payload?: unknown;
}

export interface AgentGraphMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
}

interface StreamableModel {
  stream(messages: AgentGraphMessage[]): AsyncIterable<unknown> | Promise<AsyncIterable<unknown>> | unknown;
}

interface InvokableModel {
  invoke(messages: AgentGraphMessage[]): Promise<unknown>;
  stream?: (messages: AgentGraphMessage[]) => AsyncIterable<unknown> | Promise<AsyncIterable<unknown>> | unknown;
  bindTools?: (tools: unknown[]) => InvokableModel;
}

interface InvokableTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
  pluginId?: string;
  pluginName?: string;
  methodId?: string;
  requiresApproval?: boolean;
  invoke(args: unknown): Promise<unknown>;
}

interface AgentToolCall {
  id: string;
  name: string;
  args: unknown;
}

type ToolResultClass = "success" | "empty" | "ambiguous" | "failed" | "needs_user";

interface ToolResultSummary {
  resultClass: ToolResultClass;
  options?: unknown[];
}

const ajv = new Ajv({ allErrors: true, strict: false });
const LARGE_BASE64_MIN_CHARS = 64_000;
const MAX_MODEL_TOOL_RESULT_BYTES = Math.min(AGENT_LIMITS.maxToolResultBytes, 64_000);
const MAX_MODEL_ARRAY_ITEMS = 25;
const MAX_MODEL_OBJECT_KEYS = 80;
const MAX_MODEL_STRING_CHARS = 600;
const MAX_MODEL_RESULT_DEPTH = 8;
const MAX_ACTIVE_MODEL_TOOLS = 8;

export function buildAgentGraph(input: BuildAgentGraphInput): AgentGraph {
  const configuredTools = input.tools.map(asTool);
  const baseModel = asModel(input.model);
  const tools = new Map(configuredTools.map((invokable) => {
    return [invokable.name, invokable];
  }));

  return {
    checkpointer: input.checkpointer,
    async invoke(invokeInput: AgentGraphInvokeInput): Promise<AgentRunResult> {
      const binaryRefs = new AgentBinaryRefStore();
      const messages: AgentGraphMessage[] = [
        { role: "system", content: systemPromptForAgent(input.agent) },
        ...(invokeInput.contextMessages ?? []),
        { role: "user", content: invokeInput.userMessage },
      ];
      let toolCallCount = 0;
      const completedToolCalls: AgentRunToolCall[] = [];
      const toolHistory = new Map<string, ToolResultSummary>();

      try {
        for (let iteration = 1; iteration <= input.agent.maxIterations; iteration += 1) {
          input.onEvent?.({ type: "agent:model-start", payload: { iteration, input: summarizeModelInput(messages) } });

          let assistantContent = "";
          let toolCalls: AgentToolCall[] = [];
          let usedStream = false;
          const activeTools = selectActiveModelTools(configuredTools, messages, completedToolCalls);
          const model = bindModelTools(baseModel, activeTools);
          const activeToolMap = new Map(activeTools.map((invokable) => [invokable.name, invokable]));

          if (canAttemptStreamTextResponse(input.agent, model, activeToolMap)) {
            const stream = await resolveModelStream(model, messages);
            if (stream) {
              const streamedToolCalls: AgentToolCall[] = [];
              const bufferedOutputDeltas: string[] = [];
              for await (const chunk of stream) {
                streamedToolCalls.push(...extractCompleteToolCalls(chunk));
                const thinkingDelta = extractThinkingDelta(chunk);
                if (thinkingDelta) {
                  input.onEvent?.({ type: "agent:thinking-delta", payload: { delta: thinkingDelta } });
                }

                const delta = extractStreamDelta(chunk);
                if (!delta) continue;
                assistantContent += delta;
                bufferedOutputDeltas.push(delta);
              }

              if (streamedToolCalls.length === 0) {
                for (const delta of bufferedOutputDeltas) {
                  input.onEvent?.({ type: "agent:output-delta", payload: { delta } });
                }
              } else {
                assistantContent = "";
              }

              if (assistantContent || streamedToolCalls.length > 0) {
                toolCalls = streamedToolCalls;
                usedStream = true;
              }
            }
          }

          if (!usedStream) {
            const modelResponse = await model.invoke(messages);
            assistantContent = extractContent(modelResponse);
            toolCalls = extractToolCalls(modelResponse);
          }

          input.onEvent?.({
            type: "agent:model-end",
            payload: { iteration, toolCallCount: toolCalls.length, output: assistantContent },
          });

          if (toolCalls.length === 0) {
            const unmetIntentReminder = reminderForUnmetToolIntent(invokeInput.userMessage, completedToolCalls, configuredTools);
            if (unmetIntentReminder) {
              messages.push({ role: "assistant", content: assistantContent });
              messages.push({ role: "system", content: unmetIntentReminder });
              continue;
            }

            const parsedOutput = parseOutput(input.agent, assistantContent);
            if (isWaitingUserOutput(parsedOutput)) {
              return {
                status: "waiting-user",
                output: parsedOutput,
                iterationCount: iteration,
                toolCallCount,
                ...(completedToolCalls.length > 0 ? { toolCalls: completedToolCalls } : {}),
              };
            }

            return {
              status: "success",
              output: parsedOutput,
              iterationCount: iteration,
              toolCallCount,
              ...(completedToolCalls.length > 0 ? { toolCalls: completedToolCalls } : {}),
            };
          }

          messages.push({ role: "assistant", content: assistantContent });

          for (const toolCall of toolCalls) {
            if (toolCallCount >= input.agent.maxToolCalls) {
              throw new AgentRuntimeError(
                "Agent exceeded max tool calls",
                "AGENT_MAX_TOOL_CALLS_EXCEEDED",
                "Agent exceeded the maximum number of tool calls",
                400,
              );
            }

            const tool = tools.get(toolCall.name);
            if (!tool) {
              throw new AgentRuntimeError(
                `Unknown agent tool: ${toolCall.name}`,
                "AGENT_TOOL_UNKNOWN",
                "Agent requested an unavailable tool",
                400,
              );
            }

            if (completedToolCalls.some((completed) => completed.name === tool.name)) {
              emitToolRetry(input, tool, toolCall, "Nao encontrei o arquivo, vou tentar novamente");
              await yieldToEventLoop();
            }

            emitToolIntent(input, tool, toolCall);
            await yieldToEventLoop();
            if (shouldExecuteToolImmediately(input, tool)) {
              emitToolStart(input, tool, toolCall);
              await yieldToEventLoop();
            }

            let result: unknown;
            const resolvedArgs = resolveBinaryRefsInToolArgs(toolCall.args, binaryRefs);
            const toolSignature = toolCallSignature(toolCall.name, resolvedArgs);
            const previousResult = toolHistory.get(toolSignature);
            if (previousResult && shouldStopRepeatedToolCall(previousResult.resultClass)) {
              return {
                status: "waiting-user",
                output: waitingUserOutputForRepeatedTool(toolCall.name, previousResult),
                iterationCount: iteration,
                toolCallCount,
                ...(completedToolCalls.length > 0 ? { toolCalls: completedToolCalls } : {}),
              };
            }

            try {
              result = await invokeToolWithRetry(input, tool, toolCall, resolvedArgs);
            } catch (error) {
              if (error instanceof AgentToolApprovalRequiredError) throw error;
              const errorMessage = safeErrorMessage(error);
              emitToolEnd(input, tool, toolCall, { status: "failed", error: errorMessage });
              completedToolCalls.push(toAgentRunToolCall(tool, toolCall, "failed"));
              toolHistory.set(toolSignature, { resultClass: "failed" });
              if (isUnrecoverablePermissionOrCredentialError(errorMessage)) {
                toolCallCount += 1;
                return {
                  status: "waiting-user",
                  output: waitingUserOutputForUnrecoverableToolError(toolCall.name, errorMessage),
                  iterationCount: iteration,
                  toolCallCount,
                  toolCalls: completedToolCalls,
                };
              }
              throw error;
            }
            toolCallCount += 1;
            const modelSafeResult = sanitizeToolResultForModel(result, toolCall.id, binaryRefs);
            const compactResult = compactToolResultForModel(modelSafeResult);
            const toolSummary = summarizeToolResult(compactResult);
            toolHistory.set(toolSignature, toolSummary);
            emitToolEnd(input, tool, toolCall, { status: "success", output: compactResult });
            completedToolCalls.push(toAgentRunToolCall(tool, toolCall, "success"));
            await yieldToEventLoop();
            if (shouldAskUserAfterToolResult(toolSummary.resultClass)) {
              return {
                status: "waiting-user",
                output: waitingUserOutputForRepeatedTool(toolCall.name, toolSummary),
                iterationCount: iteration,
                toolCallCount,
                toolCalls: completedToolCalls,
              };
            }
            messages.push({
              role: "tool",
              name: tool.name,
              tool_call_id: toolCall.id,
              content: stringifyToolResult(compactResult),
            });
          }

          if (input.skipFinalResponseAfterToolUse && completedToolCalls.length > 0) {
            return {
              status: "success",
              output: "",
              iterationCount: iteration,
              toolCallCount,
              toolCalls: completedToolCalls,
            };
          }

          if (iteration >= input.agent.maxIterations) {
            throw new AgentRuntimeError(
              "Agent exceeded max iterations while resolving tool calls",
              "AGENT_MAX_ITERATIONS_EXCEEDED",
              "Agent exceeded the maximum number of iterations",
              400,
            );
          }
        }

        throw new AgentRuntimeError(
          "Agent exceeded max iterations",
          "AGENT_MAX_ITERATIONS_EXCEEDED",
          "Agent exceeded the maximum number of iterations",
          400,
        );
      } finally {
        binaryRefs.disposeAll();
      }
    },
  };
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function invokeToolWithRetry(
  input: BuildAgentGraphInput,
  tool: InvokableTool,
  toolCall: AgentToolCall,
  args: unknown,
): Promise<unknown> {
  try {
    return await tool.invoke(args);
  } catch (error) {
    if (error instanceof AgentToolApprovalRequiredError || !isRetryableToolError(error)) throw error;
    emitToolRetry(input, tool, toolCall, "A ferramenta falhou, vou tentar novamente");
    await delay(250);
    return tool.invoke(args);
  }
}

function isRetryableToolError(error: unknown): boolean {
  const message = safeErrorMessage(error).toLowerCase();
  return /\b(invalid value|timeout|timed out|temporar|network|econnreset|etimedout|429|500|502|503|504)\b/.test(message);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeModelInput(messages: AgentGraphMessage[]): Record<string, unknown> {
  return {
    messageCount: messages.length,
    roles: messages.map((message) => message.role),
  };
}

function toAgentRunToolCall(
  tool: InvokableTool,
  toolCall: AgentToolCall,
  status: AgentRunToolCall["status"],
): AgentRunToolCall {
  return {
    toolCallId: toolCall.id,
    name: tool.name,
    ...(tool.pluginId ? { pluginId: tool.pluginId } : {}),
    ...(tool.pluginName ? { pluginName: tool.pluginName } : {}),
    status,
  };
}

function shouldExecuteToolImmediately(input: BuildAgentGraphInput, tool: InvokableTool): boolean {
  return tool.requiresApproval !== true || input.approvalToken === "approved";
}

function emitToolIntent(
  input: BuildAgentGraphInput,
  tool: InvokableTool,
  toolCall: AgentToolCall,
): void {
  input.onEvent?.({
    type: "agent:tool-intent",
    payload: {
      name: tool.name,
      callId: toolCall.id,
      input: toolCall.args,
      pluginId: tool.pluginId,
      pluginName: tool.pluginName,
      ...(tool.methodId ? { methodId: tool.methodId } : {}),
      requiresApproval: tool.requiresApproval === true,
    },
  });
}

function emitToolStart(
  input: BuildAgentGraphInput,
  tool: InvokableTool,
  toolCall: AgentToolCall,
): void {
  input.onEvent?.({
    type: "agent:tool-start",
    payload: {
      name: tool.name,
      callId: toolCall.id,
      input: toolCall.args,
      pluginId: tool.pluginId,
      pluginName: tool.pluginName,
      ...(tool.methodId ? { methodId: tool.methodId } : {}),
    },
  });
}

function emitToolRetry(
  input: BuildAgentGraphInput,
  tool: InvokableTool,
  toolCall: AgentToolCall,
  reason: string,
): void {
  input.onEvent?.({
    type: "agent:tool-retry",
    payload: {
      name: tool.name,
      callId: toolCall.id,
      input: toolCall.args,
      reason,
      ...(tool.pluginId ? { pluginId: tool.pluginId } : {}),
      ...(tool.pluginName ? { pluginName: tool.pluginName } : {}),
      ...(tool.methodId ? { methodId: tool.methodId } : {}),
    },
  });
}

function emitToolEnd(
  input: BuildAgentGraphInput,
  tool: InvokableTool,
  toolCall: AgentToolCall,
  result: { status: "success"; output: unknown } | { status: "failed"; error: string },
): void {
  input.onEvent?.({
    type: "agent:tool-end",
    payload: {
      name: tool.name,
      callId: toolCall.id,
      ...(tool.pluginId ? { pluginId: tool.pluginId } : {}),
      ...(tool.pluginName ? { pluginName: tool.pluginName } : {}),
      ...(tool.methodId ? { methodId: tool.methodId } : {}),
      ...result,
    },
  });
}

function asModel(value: unknown): InvokableModel {
  if (!value || typeof (value as InvokableModel).invoke !== "function") {
    throw new AgentRuntimeError(
      "Agent model must expose invoke(messages)",
      "AGENT_MODEL_INVALID",
      "Agent model is invalid",
      500,
    );
  }
  return value as InvokableModel;
}

function canAttemptStreamTextResponse(
  agent: AiAgentNodeConfig,
  model: InvokableModel,
  tools: Map<string, InvokableTool>,
): model is InvokableModel & StreamableModel {
  if (tools.size > 0) return false;
  return agent.outputMode === "text" && typeof model.stream === "function";
}

async function resolveModelStream(
  model: InvokableModel & StreamableModel,
  messages: AgentGraphMessage[],
): Promise<AsyncIterable<unknown> | null> {
  const stream = await model.stream(messages);
  return isAsyncIterable(stream) ? stream : null;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return Boolean(value && typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function");
}

function asTool(value: unknown): InvokableTool {
  const candidate = value as Partial<InvokableTool>;
  if (!candidate?.name || typeof candidate.invoke !== "function") {
    throw new AgentRuntimeError(
      "Agent tool must expose name and invoke(args)",
      "AGENT_TOOL_INVALID",
      "Agent tool is invalid",
      500,
    );
  }
  return candidate as InvokableTool;
}

function bindModelTools(model: InvokableModel, tools: InvokableTool[]): InvokableModel {
  if (tools.length === 0 || typeof model.bindTools !== "function") return model;
  return model.bindTools(tools.map(toModelToolDefinition));
}

function selectActiveModelTools(
  tools: InvokableTool[],
  messages: AgentGraphMessage[],
  completedToolCalls: AgentRunToolCall[],
): InvokableTool[] {
  if (tools.length <= MAX_ACTIVE_MODEL_TOOLS) return tools;

  const requestText = normalizeToolSearchText(messages
    .filter((message) => message.role === "user" || message.role === "system")
    .map((message) => message.content)
    .join(" "));
  const completedNames = new Set(completedToolCalls.map((toolCall) => toolCall.name));
  const scored = tools
    .map((tool, index) => ({
      tool,
      index,
      score: toolRelevanceScore(tool, requestText, completedNames),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.tool.name.localeCompare(right.tool.name));

  if (scored.length === 0) return tools.slice(0, MAX_ACTIVE_MODEL_TOOLS);
  return scored.slice(0, MAX_ACTIVE_MODEL_TOOLS).map((entry) => entry.tool);
}

function toolRelevanceScore(
  tool: InvokableTool,
  requestText: string,
  completedNames: Set<string>,
): number {
  let score = completedNames.has(tool.name) ? 6 : 0;
  const haystack = normalizeToolSearchText([
    tool.name,
    tool.description ?? "",
    tool.pluginId ?? "",
    tool.pluginName ?? "",
    tool.methodId ?? "",
  ].join(" "));
  for (const token of new Set(haystack.split(" ").filter(isUsefulToolSearchToken))) {
    if (requestText.includes(token)) score += token.length >= 6 ? 2 : 1;
  }

  for (const [needle, bonus] of toolIntentBonuses(tool)) {
    if (requestText.includes(needle)) score += bonus;
  }

  return score;
}

function toolIntentBonuses(tool: InvokableTool): Array<[string, number]> {
  const text = normalizeToolSearchText([
    tool.name,
    tool.description ?? "",
    tool.pluginId ?? "",
    tool.pluginName ?? "",
    tool.methodId ?? "",
  ].join(" "));
  const bonuses: Array<[string, number]> = [];
  if (text.includes("drive")) bonuses.push(["drive", 5], ["arquivo", 2], ["pdf", 2]);
  if (text.includes("gmail") || text.includes("email")) bonuses.push(["email", 5], ["envie", 3], ["enviar", 3], ["send", 2]);
  if (text.includes("download")) bonuses.push(["baixe", 5], ["baixar", 5], ["download", 4]);
  if (text.includes("list")) bonuses.push(["busque", 4], ["buscar", 4], ["procure", 4], ["listar", 3]);
  if (text.includes("upload")) bonuses.push(["upload", 4]);
  if (text.includes("youtube")) bonuses.push(["youtube", 5], ["video", 3]);
  if (text.includes("discord")) bonuses.push(["discord", 5]);
  if (text.includes("sheet")) bonuses.push(["sheets", 5], ["planilha", 5]);
  return bonuses;
}

function normalizeToolSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function reminderForUnmetToolIntent(
  userMessage: string,
  completedToolCalls: AgentRunToolCall[],
  tools: InvokableTool[],
): string | null {
  const requestText = normalizeToolSearchText(userMessage);
  const completedNames = new Set(completedToolCalls.map((toolCall) => toolCall.name));
  const emailTool = tools.find((tool) =>
    isEmailSendTool(tool) &&
    !completedNames.has(tool.name)
  );
  if (emailTool && hasEmailSendIntent(requestText)) {
    return [
      `The user requested an email send, but ${emailTool.name} has not been called yet.`,
      "Do not provide a final answer until the email send tool is called, approval is requested, or you need missing information from the user.",
      "Use the downloaded file reference from previous tool results as the attachment when available.",
    ].join(" ");
  }

  return null;
}

function isEmailSendTool(tool: InvokableTool): boolean {
  const text = normalizeToolSearchText([
    tool.name,
    tool.description ?? "",
    tool.pluginId ?? "",
    tool.pluginName ?? "",
    tool.methodId ?? "",
  ].join(" "));
  return (text.includes("gmail") || text.includes("email")) &&
    (text.includes("send") || text.includes("message"));
}

function hasEmailSendIntent(requestText: string): boolean {
  return requestText.includes("email") &&
    (
      requestText.includes("envie") ||
      requestText.includes("enviar") ||
      requestText.includes("mande") ||
      requestText.includes("mandar") ||
      requestText.includes("send")
    );
}

function isUsefulToolSearchToken(token: string): boolean {
  return token.length >= 3 &&
    !new Set([
      "google",
      "with",
      "from",
      "the",
      "and",
      "for",
      "message",
      "file",
      "files",
      "create",
      "send",
    ]).has(token);
}

function toModelToolDefinition(tool: InvokableTool): Record<string, any> {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description ?? tool.name,
      parameters: tool.inputSchema ?? { type: "object", properties: {} },
    },
  };
}

function extractContent(response: unknown): string {
  const content = (response as { content?: unknown })?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(extractContentBlockText).join("");
  return "";
}

export function extractStreamDelta(chunk: unknown): string {
  if (typeof chunk === "string") return chunk;
  const record = chunk as {
    content?: unknown;
    message?: { content?: unknown };
    choices?: Array<{ delta?: { content?: unknown }; message?: { content?: unknown } }>;
  };
  const choiceContent = record.choices
    ?.map((choice) => extractStreamContentValue(choice.delta?.content ?? choice.message?.content))
    .join("");
  if (choiceContent) return choiceContent;

  const messageContent = extractStreamContentValue(record.message?.content);
  if (messageContent) return messageContent;

  const content = record?.content;
  return extractStreamContentValue(content);
}

function extractStreamContentValue(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(extractStreamContentBlockText).join("");
  return "";
}

export function extractThinkingDelta(chunk: unknown): string {
  if (!chunk || typeof chunk !== "object") return "";
  const record = chunk as Record<string, unknown>;

  for (const key of ["thinking", "reasoning", "reasoning_content"]) {
    if (typeof record[key] === "string") return record[key] as string;
  }

  for (const key of ["additional_kwargs", "response_metadata"]) {
    const nested = record[key];
    if (!nested || typeof nested !== "object") continue;
    const nestedRecord = nested as Record<string, unknown>;
    for (const nestedKey of ["thinking", "reasoning", "reasoning_content"]) {
      if (typeof nestedRecord[nestedKey] === "string") return nestedRecord[nestedKey] as string;
    }
  }

  const messageThinking = extractThinkingNestedRecord(record.message);
  if (messageThinking) return messageThinking;

  if (Array.isArray(record.choices)) {
    const choicesThinking = record.choices
      .map((choice) => {
        if (!choice || typeof choice !== "object") return "";
        const choiceRecord = choice as Record<string, unknown>;
        return extractThinkingNestedRecord(choiceRecord.delta) || extractThinkingNestedRecord(choiceRecord.message);
      })
      .join("");
    if (choicesThinking) return choicesThinking;
  }

  if (Array.isArray(record.content)) {
    return record.content.map(extractThinkingContentBlockText).join("");
  }

  return "";
}

function extractThinkingNestedRecord(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["thinking", "reasoning", "reasoning_content"]) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  return "";
}

function extractThinkingContentBlockText(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const block = item as { type?: string; text?: unknown; content?: unknown };
  if ((block.type === "reasoning" || block.type === "thinking") && typeof block.text === "string") {
    return block.text;
  }
  if ((block.type === "reasoning" || block.type === "thinking") && typeof block.content === "string") {
    return block.content;
  }
  return "";
}

function extractStreamContentBlockText(item: unknown): string {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";

  const block = item as { type?: string; text?: unknown };
  if (typeof block.text === "string" && (!block.type || block.type === "text")) {
    return block.text;
  }

  return "";
}

function extractContentBlockText(item: unknown): string {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";

  const block = item as { type?: string; text?: unknown };
  if (typeof block.text === "string" && (!block.type || block.type === "text")) {
    return block.text;
  }

  return JSON.stringify(item);
}

function extractToolCalls(response: unknown): AgentToolCall[] {
  const candidate = response as {
    toolCalls?: unknown[];
    tool_calls?: unknown[];
    additional_kwargs?: { tool_calls?: unknown[] };
  };
  const toolCalls =
    candidate?.toolCalls ?? candidate?.tool_calls ?? candidate?.additional_kwargs?.tool_calls ?? [];

  return toolCalls.map((toolCall, index) => normalizeToolCall(toolCall, index));
}

function extractCompleteToolCalls(response: unknown): AgentToolCall[] {
  try {
    return extractToolCalls(response);
  } catch {
    return [];
  }
}

function normalizeToolCall(toolCall: unknown, index: number): AgentToolCall {
  const candidate = toolCall as {
    id?: string;
    name?: string;
    args?: unknown;
    function?: { name?: string; arguments?: string };
  };
  const name = candidate.name ?? candidate.function?.name;
  if (!name) {
    throw new AgentRuntimeError(
      "Model returned a tool call without a name",
      "AGENT_TOOL_CALL_INVALID",
      "Model returned an invalid tool call",
      400,
    );
  }

  return {
    id: candidate.id ?? `tool_call_${index + 1}`,
    name,
    args: candidate.args ?? parseToolArguments(candidate.function?.arguments),
  };
}

function parseToolArguments(value: string | undefined): unknown {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    throw new AgentRuntimeError(
      "Model returned invalid tool arguments",
      "AGENT_TOOL_ARGS_INVALID",
      "Model returned invalid tool arguments",
      400,
    );
  }
}

function parseOutput(agent: AiAgentNodeConfig, content: string): string | Record<string, any> {
  if (agent.outputMode === "text") return parseStructuredTextOutput(content) ?? content;

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizeJsonOutputContent(content));
  } catch {
    throw new AgentRuntimeError(
      "Agent JSON output could not be parsed",
      "AGENT_OUTPUT_JSON_INVALID",
      "Agent output is not valid JSON",
      400,
    );
  }

  if (agent.outputSchema) {
    const validate = ajv.compile(agent.outputSchema);
    if (!validate(parsed)) {
      throw new AgentRuntimeError(
        `Agent JSON output failed schema validation: ${ajv.errorsText(validate.errors)}`,
        "AGENT_OUTPUT_SCHEMA_INVALID",
        "Agent output failed schema validation",
        400,
      );
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AgentRuntimeError(
      "Agent JSON output must be an object",
      "AGENT_OUTPUT_JSON_INVALID",
      "Agent output must be a JSON object",
      400,
    );
  }

  return parsed as Record<string, any>;
}

function parseStructuredTextOutput(content: string): Record<string, any> | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : null;
  } catch {
    return null;
  }
}

function isWaitingUserOutput(output: unknown): output is Record<string, any> {
  if (!output || typeof output !== "object" || Array.isArray(output)) return false;
  const record = output as Record<string, unknown>;
  const status = record.status ?? record.state;
  return status === "waiting-user" &&
    typeof record.question === "string" &&
    record.question.trim().length > 0;
}

function toolCallSignature(name: string, args: unknown): string {
  return `${name}:${stableStringify(args)}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (Buffer.isBuffer(value)) return `"[Buffer:${value.length}]"`;
  if (isReadableLike(value)) return '"[Readable]"';
  if (value && typeof value === "object" && !Buffer.isBuffer(value) && !isReadableLike(value)) {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function summarizeToolResult(value: unknown): ToolResultSummary {
  const resultClass = classifyToolResult(value);
  return {
    resultClass,
    ...(resultClass === "ambiguous" ? { options: findResultOptions(value) ?? undefined } : {}),
  };
}

function classifyToolResult(value: unknown): ToolResultClass {
  if (containsWaitingUserMarker(value)) return "needs_user";
  if (containsEmptyResultArray(value)) return "empty";
  if (containsAmbiguousResultArray(value)) return "ambiguous";
  return "success";
}

function shouldStopRepeatedToolCall(resultClass: ToolResultClass): boolean {
  return resultClass === "empty" ||
    resultClass === "ambiguous" ||
    resultClass === "failed" ||
    resultClass === "needs_user";
}

function shouldAskUserAfterToolResult(resultClass: ToolResultClass): boolean {
  return resultClass === "empty" ||
    resultClass === "ambiguous" ||
    resultClass === "needs_user";
}

function waitingUserOutputForRepeatedTool(toolName: string, result: ToolResultSummary): Record<string, any> {
  const reason = result.resultClass === "empty"
    ? "not_found"
    : result.resultClass === "ambiguous"
      ? "ambiguous_result"
      : "needs_user";
  const question = result.resultClass === "empty"
    ? "Nao encontrei resultado para essa busca. Quer tentar outro nome ou ajustar os criterios?"
    : result.resultClass === "ambiguous"
      ? "Encontrei mais de uma opcao. Qual delas devo usar?"
      : "Preciso de mais informacoes para continuar. Como voce quer prosseguir?";
  return {
    status: "waiting-user",
    reason,
    question,
    repeatedTool: toolName,
    ...(result.options?.length ? { options: result.options } : {}),
  };
}

function waitingUserOutputForUnrecoverableToolError(toolName: string, errorMessage: string): Record<string, any> {
  const reason = isCredentialError(errorMessage)
    ? "credential_required"
    : "permission_required";
  return {
    status: "waiting-user",
    reason,
    question: "Preciso de permissao ou credenciais validas para continuar. Ajuste o acesso e me avise para tentar novamente.",
    repeatedTool: toolName,
  };
}

function isUnrecoverablePermissionOrCredentialError(message: string): boolean {
  return isCredentialError(message) ||
    /\bunauthori[sz]ed\b/i.test(message) ||
    /\bforbidden\b/i.test(message) ||
    /\bpermissions?\b/i.test(message);
}

function isCredentialError(message: string): boolean {
  return /\bcredentials?\b/i.test(message) ||
    /\bapi[\s_-]?key\b/i.test(message) ||
    /\boauth(?:\s+token)?\b/i.test(message) ||
    /\btokens?\b/i.test(message);
}

function containsWaitingUserMarker(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (value as Record<string, unknown>).status === "waiting-user";
}

function containsEmptyResultArray(value: unknown): boolean {
  return findResultArray(value, (items) => items.length === 0);
}

function containsAmbiguousResultArray(value: unknown): boolean {
  return findResultArray(value, (items) => items.length > 1);
}

function findResultOptions(value: unknown): unknown[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(item) && isResultCollectionKey(key) && item.length > 1) return item;
    if (item && typeof item === "object") {
      const nested = findResultOptions(item);
      if (nested) return nested;
    }
  }
  return null;
}

function findResultArray(value: unknown, predicate: (items: unknown[]) => boolean): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(item) && isResultCollectionKey(key) && predicate(item)) return true;
    if (item && typeof item === "object" && findResultArray(item, predicate)) return true;
  }
  return false;
}

function isResultCollectionKey(key: string): boolean {
  return ["files", "items", "results", "options"].includes(key);
}

function systemPromptForAgent(agent: AiAgentNodeConfig): string {
  if (agent.outputMode !== "json") return agent.prompt;
  const schemaInstruction = agent.outputSchema
    ? ` It must satisfy this JSON Schema: ${JSON.stringify(agent.outputSchema)}.`
    : "";
  return [
    agent.prompt,
    "Return only one valid JSON object. Do not include markdown fences, prose, code comments, or extra text.",
    schemaInstruction.trim(),
  ].filter(Boolean).join("\n\n");
}

function normalizeJsonOutputContent(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function sanitizeToolResultForModel(
  value: unknown,
  toolCallId: string,
  binaryRefs: AgentBinaryRefStore,
  path: string[] = [],
  inheritedMimeType?: string,
): unknown {
  if (Buffer.isBuffer(value)) {
    return binaryRefs.put({
      toolCallId,
      path: path.join("/"),
      type: "Buffer",
      value,
      size: value.length,
      mimeType: inheritedMimeType,
    });
  }

  if (isReadableLike(value)) {
    return binaryRefs.put({
      toolCallId,
      path: path.join("/"),
      type: "Readable",
      value,
      mimeType: inheritedMimeType,
    });
  }

  if (typeof value === "string" && shouldStoreStringAsBase64Ref(value, path)) {
    return binaryRefs.put({
      toolCallId,
      path: path.join("/"),
      type: "Base64",
      value,
      size: value.length,
      mimeType: inheritedMimeType,
    });
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizeToolResultForModel(item, toolCallId, binaryRefs, [...path, String(index)], inheritedMimeType)
    );
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const mimeType = typeof record.mimeType === "string" ? record.mimeType : inheritedMimeType;
    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [
        key,
        sanitizeToolResultForModel(item, toolCallId, binaryRefs, [...path, key], mimeType),
      ]),
    );
  }

  return value;
}

function compactToolResultForModel(value: unknown): unknown {
  const compacted = compactToolResultValue(value);
  const serialized = JSON.stringify(compacted);
  if (!serialized || Buffer.byteLength(serialized, "utf8") <= MAX_MODEL_TOOL_RESULT_BYTES) {
    return compacted;
  }

  return {
    __truncated: true,
    reason: "Tool result too large for model context",
    preview: truncateModelString(serialized, MAX_MODEL_STRING_CHARS * 4),
  };
}

function compactToolResultValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return truncateModelString(value, MAX_MODEL_STRING_CHARS);
  if (!value || typeof value !== "object") return value;
  if (Buffer.isBuffer(value) || isReadableLike(value)) return "[binary omitted]";
  if (depth >= MAX_MODEL_RESULT_DEPTH) return "[object depth limit]";

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_MODEL_ARRAY_ITEMS)
      .map((item) => compactToolResultValue(item, depth + 1));
    if (value.length > MAX_MODEL_ARRAY_ITEMS) {
      items.push({ __truncatedItems: value.length - MAX_MODEL_ARRAY_ITEMS });
    }
    return items;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const compacted = Object.fromEntries(
    entries
      .slice(0, MAX_MODEL_OBJECT_KEYS)
      .map(([key, item]) => [key, compactToolResultValue(item, depth + 1)]),
  );

  if (entries.length > MAX_MODEL_OBJECT_KEYS) {
    compacted.__truncatedKeys = entries.length - MAX_MODEL_OBJECT_KEYS;
  }

  return compacted;
}

function truncateModelString(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...[truncated ${value.length - maxChars} chars]`;
}

function shouldStoreStringAsBase64Ref(value: string, path: string[]): boolean {
  if (value.length < LARGE_BASE64_MIN_CHARS) return false;
  const key = path[path.length - 1]?.toLowerCase() ?? "";
  if (!key.includes("base64")) return false;
  return /^[A-Za-z0-9+/=\s]+$/.test(value);
}

function resolveBinaryRefsInToolArgs(value: unknown, binaryRefs: AgentBinaryRefStore): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveBinaryRefsInToolArgs(item, binaryRefs));
  }

  if (!value || typeof value !== "object" || Buffer.isBuffer(value) || isReadableLike(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.ref === "string") {
    const stored = binaryRefs.get(record.ref);
    if (stored) return stored.value;
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      resolveBinaryRefsInToolArgs(item, binaryRefs),
    ]),
  );
}

function isReadableLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { pipe?: unknown; on?: unknown };
  return typeof candidate.pipe === "function" && typeof candidate.on === "function";
}

function stringifyToolResult(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim() || "Unknown error";
}
