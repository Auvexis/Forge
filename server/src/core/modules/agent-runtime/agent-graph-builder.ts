import { Ajv } from "ajv/dist/ajv.js";
import { AgentRuntimeError } from "./agent-errors.ts";
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
  toolCallId?: string;
}

interface StreamableModel {
  stream(messages: AgentGraphMessage[]): AsyncIterable<unknown>;
}

interface InvokableModel {
  invoke(messages: AgentGraphMessage[]): Promise<unknown>;
  stream?: (messages: AgentGraphMessage[]) => AsyncIterable<unknown>;
}

interface InvokableTool {
  name: string;
  invoke(args: unknown): Promise<unknown>;
}

interface AgentToolCall {
  id: string;
  name: string;
  args: unknown;
}

const ajv = new Ajv({ allErrors: true, strict: false });

export function buildAgentGraph(input: BuildAgentGraphInput): AgentGraph {
  const model = asModel(input.model);
  const tools = new Map(input.tools.map((tool) => {
    const invokable = asTool(tool);
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
        if (canStreamTextResponse(input.agent, model, tools)) {
          input.onEvent?.({ type: "agent:model-start", payload: { iteration } });
          let content = "";
          for await (const chunk of model.stream(messages)) {
            content += extractStreamDelta(chunk);
          }
          input.onEvent?.({
            type: "agent:model-end",
            payload: { iteration, toolCallCount: 0 },
          });
          return {
            status: "success",
            output: content,
            iterationCount: iteration,
            toolCallCount,
          };
        }

        input.onEvent?.({ type: "agent:model-start", payload: { iteration } });
        const modelResponse = await model.invoke(messages);
        const assistantContent = extractContent(modelResponse);
        const toolCalls = extractToolCalls(modelResponse);
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

          input.onEvent?.({
            type: "agent:tool-start",
            payload: { name: tool.name, callId: toolCall.id },
          });
          const result = await tool.invoke(toolCall.args);
          toolCallCount += 1;
          input.onEvent?.({
            type: "agent:tool-end",
            payload: { name: tool.name, callId: toolCall.id },
          });
          messages.push({
            role: "tool",
            name: tool.name,
            toolCallId: toolCall.id,
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

function canStreamTextResponse(
  agent: AiAgentNodeConfig,
  model: InvokableModel,
  tools: Map<string, InvokableTool>,
): model is InvokableModel & StreamableModel {
  return agent.outputMode === "text" && tools.size === 0 && typeof model.stream === "function";
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

function extractContent(response: unknown): string {
  const content = (response as { content?: unknown })?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(extractContentBlockText).join("");
  return "";
}

export function extractStreamDelta(chunk: unknown): string {
  if (typeof chunk === "string") return chunk;
  const content = (chunk as { content?: unknown })?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(extractStreamContentBlockText).join("");
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
