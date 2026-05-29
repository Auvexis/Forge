import { Ajv } from "ajv/dist/ajv.js";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "./agent-errors.ts";
import type {
  AgentEventType,
  AgentRunResult,
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
  requiresApproval?: boolean;
  invoke(args: unknown): Promise<unknown>;
}

interface AgentToolCall {
  id: string;
  name: string;
  args: unknown;
}

const ajv = new Ajv({ allErrors: true, strict: false });

export function buildAgentGraph(input: BuildAgentGraphInput): AgentGraph {
  const configuredTools = input.tools.map(asTool);
  const model = bindModelTools(asModel(input.model), configuredTools);
  const tools = new Map(configuredTools.map((invokable) => {
    return [invokable.name, invokable];
  }));

  return {
    checkpointer: input.checkpointer,
    async invoke(invokeInput: AgentGraphInvokeInput): Promise<AgentRunResult> {
      const messages: AgentGraphMessage[] = [
        { role: "system", content: input.agent.prompt },
        ...(invokeInput.contextMessages ?? []),
        { role: "user", content: invokeInput.userMessage },
      ];
      let toolCallCount = 0;

      for (let iteration = 1; iteration <= input.agent.maxIterations; iteration += 1) {
        input.onEvent?.({ type: "agent:model-start", payload: { iteration } });

        let assistantContent = "";
        let toolCalls: AgentToolCall[] = [];
        let usedStream = false;

        if (canAttemptStreamTextResponse(input.agent, model, tools)) {
          const stream = await resolveModelStream(model, messages);
          if (stream) {
            const streamedToolCalls: AgentToolCall[] = [];
            for await (const chunk of stream) {
              streamedToolCalls.push(...extractCompleteToolCalls(chunk));
              const thinkingDelta = extractThinkingDelta(chunk);
              if (thinkingDelta) {
                input.onEvent?.({ type: "agent:thinking-delta", payload: { delta: thinkingDelta } });
              }

              const delta = extractStreamDelta(chunk);
              if (!delta) continue;
              assistantContent += delta;
              if (streamedToolCalls.length === 0) {
                input.onEvent?.({ type: "agent:output-delta", payload: { delta } });
              }
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
          payload: { iteration, toolCallCount: toolCalls.length },
        });

        if (toolCalls.length === 0) {
          return {
            status: "success",
            output: parseOutput(input.agent, assistantContent),
            iterationCount: iteration,
            toolCallCount,
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

          emitToolIntent(input, tool, toolCall);
          if (shouldExecuteToolImmediately(input, tool)) {
            emitToolStart(input, tool, toolCall);
          }

          let result: unknown;
          try {
            result = await tool.invoke(toolCall.args);
          } catch (error) {
            if (error instanceof AgentToolApprovalRequiredError) throw error;
            emitToolEnd(input, tool, toolCall, { status: "failed", error: safeErrorMessage(error) });
            throw error;
          }
          toolCallCount += 1;
          emitToolEnd(input, tool, toolCall, { status: "success", output: result });
          messages.push({
            role: "tool",
            name: tool.name,
            tool_call_id: toolCall.id,
            content: stringifyToolResult(result),
          });
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
    },
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
      pluginId: tool.pluginId,
      pluginName: tool.pluginName,
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
  _tools: Map<string, InvokableTool>,
): model is InvokableModel & StreamableModel {
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
  if (agent.outputMode === "text") return content;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
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

function stringifyToolResult(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim() || "Unknown error";
}
