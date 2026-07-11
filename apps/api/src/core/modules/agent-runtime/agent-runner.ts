import { randomUUID } from "node:crypto";
import {
  type AgentGraphEvent,
  type BuildAgentGraphInput,
  type AgentGraphMessage,
} from "./agent-graph-builder.ts";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "./agent-errors.ts";
import { emitAgentEvent } from "./agent-event-bus.ts";
import { AGENT_LIMITS } from "./agent-limits.ts";
import {
  AgentModelProviderRegistry,
  type AgentModelProvider,
} from "./model-provider-registry.ts";
import { AgentToolRegistry } from "./agent-tool-registry.ts";
import type { FabricAgentToolDefinition } from "./plugin-tool-adapter.ts";
import { executePluginAgentTool } from "./plugin-tool-executor.ts";
import { PluginExecutor } from "../plugins/executor.ts";
import { fabricHomePaths } from "../../runtime/fabric-home.ts";
import type {
  AgentRunInput,
  AgentRunResult,
  AgentToolConfig,
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
import {
  usesLongTermMemory,
  usesShortTermMemory,
} from "./memory/agent-memory-mode.ts";
import { toAgentRuntimeModel } from "./agent-runtime-model.ts";
import { runAgentLoop } from "./loop/agent-loop-runner.ts";
import { runAgentPlanRuntime } from "./plan/agent-plan-runner.ts";
import { AgentFileRefStore } from "./loop/agent-file-ref-store.ts";
import {
  resolveAgentChatFileCacheDir,
  resolveAgentExecutionFileCacheDir,
} from "./chat/agent-chat-paths.ts";

export interface AgentRunnerOptions {
  modelRegistry?: Pick<AgentModelProviderRegistry, "createChatModel">;
  toolRegistry?: Pick<AgentToolRegistry, "listAvailableTools" | "resolveConfiguredTools">;
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
  toolExecutor?: typeof executePluginAgentTool;
  emitEvent?: (event: AgentGraphEvent, input: AgentRunInput) => void;
}

export type PluginMemoryExecutor = (
  pluginId: string,
  methodId: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

interface GraphTool {
  name: string;
  description: string;
  instructions?: string;
  pluginId?: string;
  pluginName?: string;
  methodId?: string;
  sideEffect?: FabricAgentToolDefinition["sideEffect"];
  requiresApproval: boolean;
  inputSchema: Record<string, any>;
  timeoutMs: number;
  selection?: FabricAgentToolDefinition["selection"];
  invoke(args: unknown): Promise<unknown>;
}

export class AgentRunner {
  private readonly modelRegistry: Pick<AgentModelProviderRegistry, "createChatModel">;
  private readonly toolRegistry: Pick<AgentToolRegistry, "listAvailableTools" | "resolveConfiguredTools">;
  private readonly pluginMemoryExecutor: PluginMemoryExecutor;
  private readonly graphBuilder?: AgentRunnerOptions["graphBuilder"];
  private readonly checkpointerFactory: NonNullable<AgentRunnerOptions["checkpointerFactory"]>;
  private readonly toolExecutor: NonNullable<AgentRunnerOptions["toolExecutor"]>;
  private readonly eventEmitter: NonNullable<AgentRunnerOptions["emitEvent"]>;

  constructor(options: AgentRunnerOptions = {}) {
    this.modelRegistry = options.modelRegistry ?? new AgentModelProviderRegistry();
    this.toolRegistry = options.toolRegistry ?? new AgentToolRegistry();
    this.pluginMemoryExecutor = options.pluginMemoryExecutor ?? defaultPluginMemoryExecutor;
    this.graphBuilder = options.graphBuilder;
    this.checkpointerFactory = options.checkpointerFactory ?? defaultCheckpointerFactory;
    this.toolExecutor = options.toolExecutor ?? executePluginAgentTool;
    this.eventEmitter = options.emitEvent ?? defaultEventEmitter;
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const validated = validateRunInput(input);
    this.eventEmitter({ type: "agent:start", payload: { sessionId: input.sessionId } }, input);
    this.eventEmitter({
      type: "agent:config-snapshot",
      payload: {
        input: {
          triggerPayload: input.triggerPayload,
          userMessage: input.userMessage,
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
          ...(input.userId ? { userId: input.userId } : {}),
        },
      },
    }, input);

    try {
      const pluginTools = validated.tools.filter(isPluginToolConfig);
      const toolDefinitions = pluginTools.length > 0
        ? this.toolRegistry.resolveConfiguredTools(pluginTools)
        : [];
      const tools = this.createGraphTools(input, validated.tools, toolDefinitions);
      if (!this.graphBuilder && isToolCatalogQuestion(input.userMessage)) {
        const output = formatConfiguredToolsAnswer(tools);
        const result: AgentRunResult = {
          status: "success",
          output,
          toolCallCount: 0,
          iterationCount: 1,
          toolCalls: [],
        };
        this.eventEmitter({ type: "agent:end", payload: { status: result.status, output: result.output } }, input);
        return result;
      }

      const model = await this.modelRegistry.createChatModel(validated.model);
      const longTermMemory = usesLongTermMemory(validated.memory) ? validated.memory : undefined;

      const namespace = buildMemoryNamespace({
        scope: longTermMemory?.scope ?? "none",
        profileId: input.profileId,
        workflowId: input.workflowId,
        userId: input.userId,
      });
      const memoryMessages = await this.readMemory(input, longTermMemory, namespace);
      const contextMessages = [
        ...memoryMessages,
        ...(validated.contextMessages ?? []),
      ];
      const checkpointer = usesShortTermMemory(validated.memory) && input.sessionId
        ? await this.checkpointerFactory({
            sessionId: input.sessionId,
            dbPath: input.checkpointerDbPath,
          })
        : undefined;

      const result = this.graphBuilder
        ? await this.runLegacyGraph({
            input,
            validated,
            model,
            tools,
            checkpointer,
            contextMessages,
          })
        : await this.runConfiguredRuntime({
            input,
            validated,
            model,
            tools,
            contextMessages,
          });

      await this.writeMemory(input, longTermMemory, namespace, result.output);
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

  listTools(): FabricAgentToolDefinition[] {
    return this.toolRegistry.listAvailableTools();
  }

  private async readMemory(
    input: AgentRunInput,
    memory: AgentRunInput["memory"],
    namespace: string | null,
  ): Promise<Array<{ role: "system"; content: string }>> {
    if (!memory?.readEnabled || !namespace || !isPluginMemoryConfig(memory)) return [];

    const records = normalizePluginMemoryRecords(await this.pluginMemoryExecutor(memory.pluginId, memory.searchMethodId, {
      profileId: input.profileId,
      namespace,
      limit: memory.maxRetrievedMemories,
    }));
    this.eventEmitter({
      type: "agent:memory-read",
      payload: {
        input: { namespace, limit: memory.maxRetrievedMemories },
        output: { namespace, count: records.length, records },
      },
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
    if (!memory?.writeEnabled || !namespace || !isPluginMemoryConfig(memory)) return Promise.resolve();

    assertMemoryWriteAllowed({ memory, namespace, value: output });
    const putInput = {
      id: `memory_${randomUUID()}`,
      profileId: input.profileId,
      namespace,
      key: `agent:${input.nodeId}:last-output`,
      value: output,
      source: `workflow:${input.workflowId}`,
    };

    const write = this.pluginMemoryExecutor(memory.pluginId, memory.putMethodId, putInput);
    return Promise.resolve(write).then(() => {
      this.eventEmitter({
        type: "agent:memory-write",
        payload: {
          input: putInput,
          output: { namespace, key: `agent:${input.nodeId}:last-output` },
        },
      }, input);
    });
  }

  private createGraphTools(
    input: AgentRunInput,
    configs: AgentToolConfig[],
    definitions: FabricAgentToolDefinition[],
  ): GraphTool[] {
    let pluginIndex = 0;
    return configs.map((config) => {
      if (!isPluginToolConfig(config)) {
        return {
          name: config.name,
          description: config.description,
          ...(config.instructions ? { instructions: config.instructions } : {}),
          sideEffect: config.sideEffect,
          requiresApproval: config.requiresApproval,
          inputSchema: config.inputSchema,
          timeoutMs: config.timeoutMs,
          invoke: config.invoke,
        };
      }
      const definition = definitions[pluginIndex++];
      if (!definition) throw new Error(`Agent tool definition was not resolved for ${config.name}`);
      return {
      name: definition.name,
      description: describeConfiguredDefaults(
        definition.description,
        config.inputDefaults,
      ),
      ...(definition.instructions ? { instructions: definition.instructions } : {}),
      pluginId: definition.pluginId,
      pluginName: definition.pluginName ?? definition.pluginId,
      methodId: definition.methodId,
      sideEffect: config.sideEffect ?? definition.sideEffect,
      requiresApproval: config.requiresApproval ?? definition.requiresApproval,
      inputSchema: schemaWithoutConfiguredDefaults(definition.inputSchema, config.inputDefaults),
      timeoutMs: config.timeoutMs ?? definition.timeoutMs,
      selection: definition.selection,
      invoke: async (args: unknown) =>
        this.toolExecutor({
          definition,
          configuredTool: config,
          args: normalizeToolArgs(args),
          approvalToken: input.approvalToken,
          approvalToolName: input.approvalToolName,
          executionId: input.executionId,
          workflowId: input.workflowId,
          nodeId: input.nodeId,
        }),
      };
    });
  }

  private async runLegacyGraph(input: {
    input: AgentRunInput;
    validated: AgentRunInput;
    model: unknown;
    tools: GraphTool[];
    checkpointer: unknown;
    contextMessages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  }): Promise<AgentRunResult> {
    const graph = this.graphBuilder!({
      agent: input.validated.agent,
      model: input.model,
      tools: input.tools,
      memory: input.validated.memory,
      checkpointer: input.checkpointer,
      approvalToken: input.input.approvalToken,
      approvalToolName: input.input.approvalToolName,
      abortSignal: input.input.abortSignal,
      skipFinalResponseAfterToolUse: input.input.skipFinalResponseAfterToolUse,
      onEvent: (event) => this.eventEmitter(event, input.input),
    });
    return graph.invoke({
      userMessage: input.input.userMessage,
      sessionId: input.input.sessionId,
      contextMessages: input.contextMessages,
    });
  }

  private async runConfiguredRuntime(input: {
    input: AgentRunInput;
    validated: AgentRunInput;
    model: unknown;
    tools: GraphTool[];
    contextMessages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  }): Promise<AgentRunResult> {
    if (input.validated.agent.executionMode === "plan") {
      return runAgentPlanRuntime({
        input: input.input,
        model: input.model,
        tools: input.tools,
        contextMessages: input.contextMessages,
        maxRetriesPerTool: input.validated.agent.maxRetriesPerTool,
        emitEvent: (event) => this.eventEmitter(event, input.input),
      });
    }

    const fileRefStore = new AgentFileRefStore({
      rootDir: resolveAgentFileCacheDir(input.input),
    });

    try {
      const result = await runAgentLoop({
        model: toAgentRuntimeModel(input.model),
        userMessage: input.input.userMessage,
        contextMessages: input.contextMessages,
        tools: input.tools,
        maxIterations: input.validated.agent.maxIterations,
        maxToolCalls: input.validated.agent.maxToolCalls,
        maxRetriesPerTool: input.validated.agent.maxRetriesPerTool,
        modelCallTimeoutMs: Math.min(input.validated.agent.timeoutMs, AGENT_LIMITS.defaultToolTimeoutMs),
        abortSignal: input.input.abortSignal,
        skipFinalResponseAfterToolUse: input.input.skipFinalResponseAfterToolUse,
        fileRefStore,
        approvedTool: input.input.approvalToken === "approved" && input.input.approvalToolName && input.input.approvalToolArgs
          ? {
              toolName: input.input.approvalToolName,
              params: input.input.approvalToolArgs,
              resumeState: input.input.approvalToolResumeState,
            }
          : undefined,
        emitEvent: (event) => this.eventEmitter(event, input.input),
      });
      fileRefStore.cleanupAll();
      return result;
    } catch (error) {
      if (!(error instanceof AgentToolApprovalRequiredError)) {
        fileRefStore.cleanupAll();
      }
      throw error;
    }
  }
}

function schemaWithoutConfiguredDefaults(
  schema: Record<string, any>,
  defaults: Record<string, any> | undefined,
): Record<string, any> {
  const defaultKeys = Object.keys(defaults ?? {}).filter((key) => defaults?.[key] !== undefined);
  if (defaultKeys.length === 0) return schema;

  const properties = schema.properties && typeof schema.properties === "object" && !Array.isArray(schema.properties)
    ? Object.fromEntries(
        Object.entries(schema.properties).filter(([key]) => !defaultKeys.includes(key)),
      )
    : schema.properties;
  return {
    ...schema,
    ...(properties ? { properties } : {}),
    ...(Array.isArray(schema.required)
      ? { required: schema.required.filter((key: unknown) => typeof key !== "string" || !defaultKeys.includes(key)) }
      : {}),
  };
}

function describeConfiguredDefaults(
  description: string,
  defaults: Record<string, any> | undefined,
): string {
  const defaultKeys = Object.keys(defaults ?? {}).filter((key) => defaults?.[key] !== undefined);
  if (defaultKeys.length === 0) return description;

  const details = defaultKeys.map((key) => `${key} is already configured`).join("; ");
  return `${description} ${details}.`;
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
    tools: input.tools.map(validateAgentToolConfig),
  };
}

function validateAgentToolConfig(tool: AgentToolConfig): AgentToolConfig {
  if (isPluginToolConfig(tool)) return validateAiToolConfig(tool);
  if (!tool.name?.trim() || !tool.description?.trim() || typeof tool.invoke !== "function") {
    throw new AgentRuntimeError("Invalid callable agent tool", "AGENT_CONFIG_INVALID", "Invalid callable agent tool", 400);
  }
  return tool;
}

function isPluginToolConfig(tool: AgentToolConfig): tool is AiToolNodeConfig {
  return "type" in tool && tool.type === "ai-tool";
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

function isToolCatalogQuestion(message: string): boolean {
  const normalized = message
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const asksAboutTools = /\b(ferramentas?|tools?|acoes|capacidades|recursos)\b/.test(normalized);
  const asksAccess =
    /\b(voce|vc|tem|acesso|pode|consegue|disponiveis?|lista|quais|qual)\b/.test(normalized) ||
    /\b(what|which|available|access|use|usable|can|do|have|list)\b/.test(normalized);
  return asksAboutTools && asksAccess;
}

function formatConfiguredToolsAnswer(tools: Array<Pick<GraphTool, "name" | "description" | "pluginName">>): string {
  if (!tools.length) return "Nao tenho ferramentas configuradas para este agente no momento.";

  const lines = tools.map((tool) => {
    const owner = tool.pluginName ? `${tool.pluginName}: ` : "";
    return `- ${owner}${tool.description || tool.name}`;
  });
  return ["Tenho acesso a estas ferramentas configuradas:", ...lines].join("\n");
}

function resolveAgentFileCacheDir(input: AgentRunInput): string {
  if (input.sessionId) {
    return resolveAgentChatFileCacheDir({
      profilesDir: fabricHomePaths.profilesDir,
      profileId: input.profileId,
      chatId: input.sessionId,
    });
  }
  return resolveAgentExecutionFileCacheDir({
    profilesDir: fabricHomePaths.profilesDir,
    profileId: input.profileId,
    executionId: input.executionId,
  });
}
