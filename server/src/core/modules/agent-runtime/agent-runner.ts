import { randomUUID } from "node:crypto";
import {
  type AgentGraphEvent,
  type BuildAgentGraphInput,
  buildAgentGraph,
} from "./agent-graph-builder.ts";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "./agent-errors.ts";
import { emitAgentEvent } from "./agent-event-bus.ts";
import { AGENT_LIMITS } from "./agent-limits.ts";
import {
  AgentModelProviderRegistry,
  type AgentModelProvider,
} from "./model-provider-registry.ts";
import { AgentToolRegistry } from "./agent-tool-registry.ts";
import type { SailorAgentToolDefinition } from "./plugin-tool-adapter.ts";
import { executePluginAgentTool } from "./plugin-tool-executor.ts";
import { PluginExecutor } from "../plugins/executor.ts";
import type {
  AgentRunInput,
  AgentRunResult,
  AiMemoryNodeConfig,
  AiToolNodeConfig,
} from "./agent-types.ts";
import {
  validateAiAgentConfig,
  validateAiMemoryConfig,
  validateAiModelConfig,
  validateAiToolConfig,
} from "./agent-validation.ts";
import { createAgentCheckpointer } from "./memory/agent-checkpointer.ts";
import type { AgentMemoryRecord, AgentMemoryStore } from "./memory/agent-memory-store.ts";
import {
  assertMemoryWriteAllowed,
  buildMemoryNamespace,
} from "./memory/agent-memory-policy.ts";

export interface AgentRunnerOptions {
  modelRegistry?: Pick<AgentModelProviderRegistry, "createChatModel">;
  toolRegistry?: Pick<AgentToolRegistry, "listAvailableTools" | "resolveConfiguredTools">;
  memoryStore?: AgentMemoryAccess;
  pluginMemoryExecutor?: PluginMemoryExecutor;
  graphBuilder?: (input: BuildAgentGraphInput) => {
    invoke(input: {
      userMessage: string;
      sessionId?: string;
      contextMessages?: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
    }): Promise<AgentRunResult>;
  };
  checkpointerFactory?: (input: {
    sessionId: string;
    dbPath?: string;
  }) => Promise<unknown>;
  emitEvent?: (event: AgentGraphEvent, input: AgentRunInput) => void;
}

export interface AgentMemoryAccess {
  search(input: {
    profileId: string;
    namespace: string;
    limit?: number;
  }): Array<Pick<AgentMemoryRecord, "key" | "value">> | Promise<Array<Pick<AgentMemoryRecord, "key" | "value">>>;
  put(input: {
    id: string;
    profileId: string;
    namespace: string;
    key: string;
    value: unknown;
    source: string;
  }): unknown | Promise<unknown>;
}

export type PluginMemoryExecutor = (
  pluginId: string,
  methodId: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

interface GraphTool {
  name: string;
  description: string;
  pluginId?: string;
  pluginName?: string;
  requiresApproval: boolean;
  inputSchema: Record<string, any>;
  invoke(args: unknown): Promise<unknown>;
}

export class AgentRunner {
  private readonly modelRegistry: Pick<AgentModelProviderRegistry, "createChatModel">;
  private readonly toolRegistry: Pick<AgentToolRegistry, "listAvailableTools" | "resolveConfiguredTools">;
  private readonly memoryStore?: AgentMemoryAccess;
  private readonly pluginMemoryExecutor: PluginMemoryExecutor;
  private readonly graphBuilder: NonNullable<AgentRunnerOptions["graphBuilder"]>;
  private readonly checkpointerFactory: NonNullable<AgentRunnerOptions["checkpointerFactory"]>;
  private readonly eventEmitter: NonNullable<AgentRunnerOptions["emitEvent"]>;

  constructor(options: AgentRunnerOptions = {}) {
    this.modelRegistry = options.modelRegistry ?? new AgentModelProviderRegistry();
    this.toolRegistry = options.toolRegistry ?? new AgentToolRegistry();
    this.memoryStore = options.memoryStore;
    this.pluginMemoryExecutor = options.pluginMemoryExecutor ?? defaultPluginMemoryExecutor;
    this.graphBuilder = options.graphBuilder ?? buildAgentGraph;
    this.checkpointerFactory = options.checkpointerFactory ?? defaultCheckpointerFactory;
    this.eventEmitter = options.emitEvent ?? defaultEventEmitter;
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const validated = validateRunInput(input);
    this.eventEmitter({ type: "agent:start", payload: { sessionId: input.sessionId } }, input);

    try {
      const model = await this.modelRegistry.createChatModel(validated.model);
      const toolDefinitions = this.toolRegistry.resolveConfiguredTools(validated.tools);

      const namespace = buildMemoryNamespace({
        scope: validated.memory?.scope ?? "none",
        profileId: input.profileId,
        workflowId: input.workflowId,
        userId: input.userId,
      });
      const memoryMessages = await this.readMemory(input, validated.memory, namespace);
      const contextMessages = [
        ...memoryMessages,
        ...(validated.contextMessages ?? []),
      ];
      const checkpointer = input.sessionId
        ? await this.checkpointerFactory({
            sessionId: input.sessionId,
            dbPath: input.checkpointerDbPath,
          })
        : undefined;

      const graph = this.graphBuilder({
        agent: validated.agent,
        model,
        tools: this.createGraphTools(input, validated.tools, toolDefinitions),
        memory: validated.memory,
        checkpointer,
        approvalToken: input.approvalToken,
        onEvent: (event) => this.eventEmitter(event, input),
      });
      const result = await graph.invoke({
        userMessage: input.userMessage,
        sessionId: input.sessionId,
        contextMessages,
      });

      await this.writeMemory(input, validated.memory, namespace, result.output);
      this.eventEmitter({ type: "agent:end", payload: { status: result.status, output: result.output } }, input);
      return result;
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) throw error;
      this.eventEmitter({ type: "agent:error", payload: serializeErrorPayload(error) }, input);
      if (error instanceof AgentRuntimeError) throw error;
      const detail = safeErrorMessage(error);
      throw new AgentRuntimeError(
        `Agent run failed: ${detail}`,
        "AGENT_RUN_FAILED",
        `Agent execution failed: ${detail}`,
        500,
      );
    }
  }

  listTools(): SailorAgentToolDefinition[] {
    return this.toolRegistry.listAvailableTools();
  }

  private async readMemory(
    input: AgentRunInput,
    memory: AgentRunInput["memory"],
    namespace: string | null,
  ): Promise<Array<{ role: "system"; content: string }>> {
    if (!memory?.readEnabled || !namespace) return [];

    const records = isPluginMemoryConfig(memory)
      ? normalizePluginMemoryRecords(await this.pluginMemoryExecutor(memory.pluginId, memory.searchMethodId, {
          profileId: input.profileId,
          namespace,
          limit: memory.maxRetrievedMemories,
        }))
      : (await this.memoryStore?.search({
          profileId: input.profileId,
          namespace,
          limit: memory.maxRetrievedMemories,
        })) ?? [];
    this.eventEmitter({
      type: "agent:memory-read",
      payload: { namespace, count: records.length },
    }, input);

    return records.map((record) => ({
      role: "system",
      content: `Memory ${record.key}: ${formatMemoryValue(record.value)}`,
    }));
  }

  private writeMemory(
    input: AgentRunInput,
    memory: AgentRunInput["memory"],
    namespace: string | null,
    output: AgentRunResult["output"],
  ): Promise<void> {
    if (!memory?.writeEnabled || !namespace) return Promise.resolve();

    assertMemoryWriteAllowed({ memory, namespace, value: output });
    const putInput = {
      id: `memory_${randomUUID()}`,
      profileId: input.profileId,
      namespace,
      key: `agent:${input.nodeId}:last-output`,
      value: output,
      source: `workflow:${input.workflowId}`,
    };

    const write = isPluginMemoryConfig(memory)
      ? this.pluginMemoryExecutor(memory.pluginId, memory.putMethodId, putInput)
      : this.memoryStore?.put(putInput);
    return Promise.resolve(write).then(() => {
      this.eventEmitter({
        type: "agent:memory-write",
        payload: { namespace, key: `agent:${input.nodeId}:last-output` },
      }, input);
    });
  }

  private createGraphTools(
    input: AgentRunInput,
    configs: AiToolNodeConfig[],
    definitions: SailorAgentToolDefinition[],
  ): GraphTool[] {
    return definitions.map((definition, index) => ({
      name: definition.name,
      description: definition.description,
      pluginId: definition.pluginId,
      pluginName: definition.pluginName ?? definition.pluginId,
      requiresApproval: configs[index]?.requiresApproval ?? definition.requiresApproval,
      inputSchema: definition.inputSchema,
      invoke: async (args: unknown) =>
        executePluginAgentTool({
          definition,
          configuredTool: configs[index],
          args: normalizeToolArgs(args),
          approvalToken: input.approvalToken,
          executionId: input.executionId,
          workflowId: input.workflowId,
          nodeId: input.nodeId,
        }),
    }));
  }
}

function validateRunInput(input: AgentRunInput): AgentRunInput {
  assertNonEmpty("profileId", input.profileId);
  assertNonEmpty("workflowId", input.workflowId);
  assertNonEmpty("executionId", input.executionId);
  assertNonEmpty("nodeId", input.nodeId);
  if (!input.userMessage.trim() || input.userMessage.length > AGENT_LIMITS.maxUserMessageChars) {
    throw new AgentRuntimeError(
      "Invalid agent user message",
      "AGENT_RUN_INPUT_INVALID",
      "Invalid agent user message",
      400,
    );
  }

  return {
    ...input,
    agent: validateAiAgentConfig(input.agent),
    model: validateAiModelConfig(input.model),
    memory: input.memory ? validateAiMemoryConfig(input.memory) : undefined,
    tools: input.tools.map(validateAiToolConfig),
  };
}

function assertNonEmpty(field: string, value: string): void {
  if (!value?.trim()) {
    throw new AgentRuntimeError(
      `Agent run input missing ${field}`,
      "AGENT_RUN_INPUT_INVALID",
      "Invalid agent run input",
      400,
    );
  }
}

async function defaultCheckpointerFactory(input: {
  sessionId: string;
  dbPath?: string;
}): Promise<unknown> {
  if (!input.dbPath) return undefined;
  return createAgentCheckpointer({ dbPath: input.dbPath });
}

function defaultEventEmitter(event: AgentGraphEvent, input: AgentRunInput): void {
  emitAgentEvent({
    workflowId: input.workflowId,
    executionId: input.executionId,
    nodeId: input.nodeId,
    type: event.type,
    payload: event.payload,
  });
}

async function defaultPluginMemoryExecutor(
  pluginId: string,
  methodId: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  return PluginExecutor.execute(pluginId, methodId, params);
}

function isPluginMemoryConfig(
  memory: AiMemoryNodeConfig,
): memory is AiMemoryNodeConfig & {
  adapter: "plugin-memory-store";
  pluginId: string;
  searchMethodId: string;
  putMethodId: string;
} {
  return (
    memory.adapter === "plugin-memory-store" &&
    typeof memory.pluginId === "string" &&
    typeof memory.searchMethodId === "string" &&
    typeof memory.putMethodId === "string"
  );
}

function normalizePluginMemoryRecords(result: unknown): Array<Pick<AgentMemoryRecord, "key" | "value">> {
  if (!Array.isArray(result)) {
    throw new AgentRuntimeError(
      "Plugin memory search returned an invalid response",
      "AGENT_MEMORY_PROVIDER_INVALID",
      "Agent memory provider returned invalid data",
      502,
    );
  }

  return result.map((item) => {
    if (!item || typeof item !== "object") {
      throw new AgentRuntimeError(
        "Plugin memory search returned an invalid record",
        "AGENT_MEMORY_PROVIDER_INVALID",
        "Agent memory provider returned invalid data",
        502,
      );
    }
    const record = item as Record<string, unknown>;
    if (typeof record.key !== "string" || !record.key.trim()) {
      throw new AgentRuntimeError(
        "Plugin memory search returned a record without a key",
        "AGENT_MEMORY_PROVIDER_INVALID",
        "Agent memory provider returned invalid data",
        502,
      );
    }
    return { key: record.key, value: record.value };
  });
}

function normalizeToolArgs(args: unknown): Record<string, any> {
  if (!args || typeof args !== "object" || Array.isArray(args)) return {};
  return args as Record<string, any>;
}

function formatMemoryValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function serializeErrorPayload(error: unknown): Record<string, string> {
  if (error instanceof AgentRuntimeError) {
    return { code: error.code, message: error.publicMessage };
  }
  return { code: "AGENT_RUN_FAILED", message: "Agent execution failed" };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim() || "Unknown error";
}
