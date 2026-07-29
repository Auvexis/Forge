import { randomUUID } from "node:crypto";
import type { AgentRuntimeEvent } from "./agent-runtime-events.ts";
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
import type { AgentMemoryRecord, AgentMemoryStore } from "./memory/agent-memory-store.ts";
import {
  assertMemoryWriteAllowed,
  buildMemoryNamespace,
} from "./memory/agent-memory-policy.ts";
import { usesLongTermMemory } from "./memory/agent-memory-mode.ts";
import { toAgentRuntimeModel } from "./agent-runtime-model.ts";
import { routeAgentIntent } from "./intent/agent-intent-gateway.ts";
import { runMcpAgentLoop } from "./loop/mcp-agent-loop.ts";
import { InternalMcpClient } from "./mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "./mcp/internal-mcp-server.ts";
import type { InternalMcpTool } from "./mcp/internal-mcp-types.ts";
import { AgentRuntimeLogger } from "./observability/agent-runtime-logger.ts";
import type { AgentRuntimeStateLifecycle } from "./persistence/agent-runtime-state-store.ts";
import type { AgentPendingInteraction } from "./contracts/agent-domain-contracts.ts";
import { routePendingInteractionReply } from "./interactions/pending-interaction-router.ts";

export interface AgentRunnerOptions {
  modelRegistry?: Pick<AgentModelProviderRegistry, "createChatModel">;
  toolRegistry?: Pick<AgentToolRegistry, "listAvailableTools" | "resolveConfiguredTools">;
  pluginMemoryExecutor?: PluginMemoryExecutor;
  toolExecutor?: typeof executePluginAgentTool;
  emitEvent?: (event: AgentRuntimeEvent, input: AgentRunInput) => void;
  stateStoreFactory?: () => AgentRuntimeStateLifecycle;
}

export type PluginMemoryExecutor = (
  pluginId: string,
  methodId: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

export class AgentRunner {
  private readonly modelRegistry: Pick<AgentModelProviderRegistry, "createChatModel">;
  private readonly toolRegistry: Pick<AgentToolRegistry, "listAvailableTools" | "resolveConfiguredTools">;
  private readonly pluginMemoryExecutor: PluginMemoryExecutor;
  private readonly toolExecutor: NonNullable<AgentRunnerOptions["toolExecutor"]>;
  private readonly eventEmitter: NonNullable<AgentRunnerOptions["emitEvent"]>;
  private readonly stateStoreFactory?: AgentRunnerOptions["stateStoreFactory"];

  constructor(options: AgentRunnerOptions = {}) {
    this.modelRegistry = options.modelRegistry ?? new AgentModelProviderRegistry();
    this.toolRegistry = options.toolRegistry ?? new AgentToolRegistry();
    this.pluginMemoryExecutor = options.pluginMemoryExecutor ?? defaultPluginMemoryExecutor;
    this.toolExecutor = options.toolExecutor ?? executePluginAgentTool;
    this.eventEmitter = options.emitEvent ?? defaultEventEmitter;
    this.stateStoreFactory = options.stateStoreFactory;
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const validated = validateRunInput(input);
    const state = this.stateStoreFactory?.();
    const pending = state?.findPendingInteraction(input) ?? null;
    const runId = pending?.runId ?? `run_${randomUUID()}`;
    const logger = new AgentRuntimeLogger({
      profileId: input.profileId,
      workflowId: input.workflowId,
      executionId: input.executionId,
      nodeId: input.nodeId,
      runId,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    });
    if (pending) {
      state?.resumeRun(input.profileId, pending.runId);
      const reply = routePendingInteractionReply(pending, input.userMessage);
      if (reply.type === "cancel" || (reply.type === "confirm" && !reply.confirmed)) {
        state?.cancelPendingInteraction(input.profileId, pending.id);
        state?.markRunCancelled();
        logger.info("interaction.resolved", { interactionId: pending.id, resolution: "cancelled" });
        return {
          status: "cancelled",
          output: "Operação cancelada.",
          toolCallCount: 0,
          iterationCount: 1,
          toolCalls: [],
        };
      }
      state?.resolvePendingInteraction(input.profileId, pending.id, reply);
      state?.markRunRunning();
      logger.info("interaction.resolved", { interactionId: pending.id, resolution: reply.type });
    } else {
      state?.startRun(runId, input);
      state?.markRunRunning();
    }
    logger.info("run.started", { hasSession: Boolean(input.sessionId) });
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
      const tools = this.createMcpTools(input, validated.tools, toolDefinitions);
      if (isToolCatalogQuestion(input.userMessage)) {
        const output = formatConfiguredToolsAnswer(tools);
        const result: AgentRunResult = {
          status: "success",
          output,
          toolCallCount: 0,
          iterationCount: 1,
          toolCalls: [],
        };
        state?.markRunCompleted();
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
        ...pendingContextMessages(pending),
      ];
      const result = await this.runMcpRuntime({
        input,
        validated,
        model,
        tools,
        contextMessages,
        logger,
        state,
        pending,
      });

      await this.writeMemory(input, longTermMemory, namespace, result.output);
      if (result.status === "waiting-user") state?.markRunWaitingUser();
      else state?.markRunCompleted();
      logger.info("run.completed", {
        status: result.status,
        toolCallCount: result.toolCallCount,
        iterationCount: result.iterationCount,
      });
      this.eventEmitter({ type: "agent:end", payload: { status: result.status, output: result.output } }, input);
      return result;
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) {
        state?.markRunWaitingApproval();
        logger.info("approval.requested", { toolName: error.approvalRequest.toolName });
        throw error;
      }
      state?.markRunFailed();
      logger.error("run.failed", serializeErrorPayload(error));
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

  private createMcpTools(
    input: AgentRunInput,
    configs: AgentToolConfig[],
    definitions: FabricAgentToolDefinition[],
  ): InternalMcpTool[] {
    let pluginIndex = 0;
    return configs.map((config) => {
      if (!isPluginToolConfig(config)) {
        return {
          name: config.name,
          summary: config.description,
          ...(config.instructions ? { instructions: config.instructions } : {}),
          sideEffect: config.sideEffect,
          requiresApproval: config.requiresApproval,
          inputSchema: config.inputSchema,
          timeoutMs: config.timeoutMs,
          invoke: async (arguments_) => config.invoke(arguments_),
        };
      }
      const definition = definitions[pluginIndex++];
      if (!definition) throw new Error(`Agent tool definition was not resolved for ${config.name}`);
      return {
      name: definition.name,
      summary: describeConfiguredDefaults(
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
      invoke: async (args: Record<string, unknown>) =>
        this.toolExecutor({
          definition,
          configuredTool: config,
          args,
          approvalToken: input.approvalToken,
          approvalToolName: input.approvalToolName,
          executionId: input.executionId,
          workflowId: input.workflowId,
          nodeId: input.nodeId,
        }),
      };
    });
  }

  private async runMcpRuntime(input: {
    input: AgentRunInput;
    validated: AgentRunInput;
    model: unknown;
    tools: InternalMcpTool[];
    contextMessages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
    logger: AgentRuntimeLogger;
    state?: AgentRuntimeStateLifecycle;
    pending?: AgentPendingInteraction | null;
  }): Promise<AgentRunResult> {
    const model = toAgentRuntimeModel(input.model);
    const client = new InternalMcpClient(new InternalMcpServer(input.tools));
    const isApprovalResume = input.input.approvalToken === "approved" &&
      Boolean(input.input.approvalToolResumeState);
    const isPendingLoopResume = input.pending?.context.source === "loop";
    const intent = isApprovalResume || isPendingLoopResume
      ? null
      : await routeAgentIntent({
          model,
          systemPrompt: input.validated.agent.prompt,
          userMessage: input.input.userMessage,
          contextMessages: input.contextMessages,
          tools: client.listTools(),
          signal: input.input.abortSignal,
        });

    if (isApprovalResume) {
      input.logger.info("approval.resumed", { toolName: input.input.approvalToolName });
    } else if (intent) {
      input.logger.info("intent.classified", {
        mode: intent.mode,
        ...(intent.mode === "action" ? { actionCount: intent.actions.length } : {}),
      });
    }
    if (intent?.mode === "chat") {
      return { status: "success", output: intent.response, iterationCount: 1, toolCallCount: 0, toolCalls: [] };
    }
    if (intent?.mode === "clarify") {
      input.logger.info("interaction.created", { kind: "clarification" });
      input.state?.createPendingInteraction({
        id: `interaction_${randomUUID()}`,
        kind: "clarification",
        question: intent.question,
        context: {
          source: "intent",
          originalUserMessage: input.input.userMessage,
        },
      });
      return {
        status: "waiting-user",
        output: { status: "waiting-user", question: intent.question },
        iterationCount: 1,
        toolCallCount: 0,
        toolCalls: [],
      };
    }

    return runMcpAgentLoop({
      model,
      client,
      systemPrompt: input.validated.agent.prompt,
      userMessage: input.input.userMessage,
      contextMessages: input.contextMessages,
      actions: intent?.mode === "action" ? intent.actions : [],
      maxToolCalls: input.validated.agent.maxToolCalls,
      maxRetriesPerTool: input.validated.agent.maxRetriesPerTool,
      abortSignal: input.input.abortSignal,
      approvedTool: input.input.approvalToken === "approved" &&
          input.input.approvalToolName &&
          input.input.approvalToolArgs
        ? {
            toolName: input.input.approvalToolName,
            arguments: input.input.approvalToolArgs,
            resumeState: input.input.approvalToolResumeState,
          }
        : undefined,
      emitEvent: (event) => this.eventEmitter(event, input.input),
      logger: input.logger,
      state: input.state,
      resumeState: isPendingLoopResume ? input.pending?.context.resumeState : undefined,
    });
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

function defaultEventEmitter(event: AgentRuntimeEvent, input: AgentRunInput): void {
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

function pendingContextMessages(
  pending: AgentPendingInteraction | null,
): Array<{ role: "user" | "tool"; content: string }> {
  if (!pending) return [];
  const original = typeof pending.context.originalUserMessage === "string"
    ? pending.context.originalUserMessage
    : "";
  return [
    ...(original ? [{ role: "user" as const, content: original }] : []),
    {
      role: "tool" as const,
      content: JSON.stringify({
        pendingInteraction: {
          kind: pending.kind,
          question: pending.question,
          interruptedOutput: pending.context.interruptedOutput,
        },
      }),
    },
  ];
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

function formatConfiguredToolsAnswer(tools: Array<Pick<InternalMcpTool, "name" | "summary" | "pluginName">>): string {
  if (!tools.length) return "Nao tenho ferramentas configuradas para este agente no momento.";

  const lines = tools.map((tool) => {
    const owner = tool.pluginName ? `${tool.pluginName}: ` : "";
    return `- ${owner}${tool.summary || tool.name}`;
  });
  return ["Tenho acesso a estas ferramentas configuradas:", ...lines].join("\n");
}
