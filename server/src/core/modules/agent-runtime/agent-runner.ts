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
import {
  usesLongTermMemory,
  usesShortTermMemory,
} from "./memory/agent-memory-mode.ts";
import { generateAgentPlan } from "./plan/agent-plan-generator.ts";
import { executeAgentPlan } from "./plan/agent-plan-executor.ts";
import { createAgentPlanRepairer } from "./plan/agent-plan-repairer.ts";
import { generateAgentFinalResponse } from "./plan/agent-final-response-generator.ts";
import { routeAgentIntent } from "./intent/agent-intent-router.ts";

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
  sideEffect?: SailorAgentToolDefinition["sideEffect"];
  requiresApproval: boolean;
  inputSchema: Record<string, any>;
  timeoutMs: number;
  selection?: SailorAgentToolDefinition["selection"];
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
      const toolDefinitions = this.toolRegistry.resolveConfiguredTools(validated.tools);
      if (!this.graphBuilder && isToolCatalogQuestion(input.userMessage)) {
        const output = formatConfiguredToolsAnswer(toolDefinitions);
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

      const tools = this.createGraphTools(input, validated.tools, toolDefinitions);
      const result = this.graphBuilder
        ? await this.runLegacyGraph({
            input,
            validated,
            model,
            tools,
            checkpointer,
            contextMessages,
          })
        : await this.runPlanRuntime({
            input,
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

  listTools(): SailorAgentToolDefinition[] {
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
    configs: AiToolNodeConfig[],
    definitions: SailorAgentToolDefinition[],
  ): GraphTool[] {
    return definitions.map((definition, index) => ({
      name: definition.name,
      description: describeConfiguredDefaults(
        definition.description,
        configs[index]?.inputDefaults,
      ),
      ...(definition.instructions ? { instructions: definition.instructions } : {}),
      pluginId: definition.pluginId,
      pluginName: definition.pluginName ?? definition.pluginId,
      methodId: definition.methodId,
      sideEffect: configs[index]?.sideEffect ?? definition.sideEffect,
      requiresApproval: configs[index]?.requiresApproval ?? definition.requiresApproval,
      inputSchema: schemaWithoutConfiguredDefaults(definition.inputSchema, configs[index]?.inputDefaults),
      timeoutMs: configs[index]?.timeoutMs ?? definition.timeoutMs,
      selection: definition.selection,
      invoke: async (args: unknown) =>
        this.toolExecutor({
          definition,
          configuredTool: configs[index],
          args: normalizeToolArgs(args),
          approvalToken: input.approvalToken,
          approvalToolName: input.approvalToolName,
          executionId: input.executionId,
          workflowId: input.workflowId,
          nodeId: input.nodeId,
        }),
    }));
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

  private async runPlanRuntime(input: {
    input: AgentRunInput;
    model: unknown;
    tools: GraphTool[];
    contextMessages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  }): Promise<AgentRunResult> {
    const model = toPlanModel(input.model);
    const intent = await routeAgentIntent({
      model,
      userMessage: input.input.userMessage,
      contextMessages: input.contextMessages,
      tools: input.tools,
    });
    if (intent.mode === "chat") {
      return {
        status: "success",
        output: intent.answer?.trim() || input.input.userMessage,
        toolCallCount: 0,
        iterationCount: 1,
        toolCalls: [],
      };
    }

    const plan = await generateAgentPlan({
      model,
      userMessage: input.input.userMessage,
      tools: input.tools,
      saveMessage: (message) => {
        this.eventEmitter({ type: "agent:thinking", payload: { message } } as AgentGraphEvent, input.input);
      },
    });
    if (plan.steps.length > 0) {
      this.eventEmitter({ type: "agent:plan-start", payload: {} } as AgentGraphEvent, input.input);
      this.eventEmitter({ type: "agent:plan-end", payload: { steps: plan.steps.length } } as AgentGraphEvent, input.input);
    }

    const repairer = createAgentPlanRepairer({
      model,
      saveMessage: (message) => {
        this.eventEmitter({ type: "agent:repair-start", payload: { message } } as AgentGraphEvent, input.input);
      },
    });
    const result = await executeAgentPlan({
      plan,
      tools: input.tools,
      executionId: input.input.executionId,
      approval: input.input.approvalToken
        ? {
            status: input.input.approvalToken === "approved" ? "approved" : "rejected",
            toolName: input.input.approvalToolName,
          }
        : undefined,
      emitEvent: (event) => this.eventEmitter(event as AgentGraphEvent, input.input),
      repairStep: async (repairInput) => {
        this.eventEmitter({ type: "agent:repair-start", payload: { stepId: repairInput.step.id } } as AgentGraphEvent, input.input);
        const repair = await repairer.repairStep(repairInput);
        this.eventEmitter({ type: "agent:repair-end", payload: { stepId: repairInput.step.id, repaired: Boolean(repair) } } as AgentGraphEvent, input.input);
        return repair ?? { params: repairInput.step.params };
      },
    });
    const output = await this.finalOutputForPlanRun({
      input: input.input,
      model,
      plan,
      result,
    });

    return {
      status: result.status === "cancelled" ? "cancelled" : result.status,
      output,
      toolCallCount: result.toolCallCount,
      iterationCount: result.iterationCount,
      toolCalls: result.toolCalls,
      approvalId: result.approvalId,
    };
  }

  private async finalOutputForPlanRun(input: {
    input: AgentRunInput;
    model: ReturnType<typeof toPlanModel>;
    plan: Awaited<ReturnType<typeof generateAgentPlan>>;
    result: Awaited<ReturnType<typeof executeAgentPlan>>;
  }): Promise<AgentRunResult["output"]> {
    if (input.input.skipFinalResponseAfterToolUse) return input.result.output as AgentRunResult["output"];
    if (input.result.status !== "success") return input.result.output as AgentRunResult["output"];

    return generateAgentFinalResponse({
      model: input.model,
      userMessage: input.input.userMessage,
      plan: input.plan,
      execution: input.result,
    });
  }
}

function toPlanModel(model: unknown) {
  const candidate = model as {
    routeIntent?: (input: { messages: any[]; schema: Record<string, any> }) => Promise<unknown>;
    generatePlan?: (input: { messages: any[]; schema: Record<string, any> }) => Promise<any>;
    repairPlanStep?: (input: { messages: any[] }, schema?: Record<string, any>) => Promise<any>;
    generateFinalResponse?: (input: { messages: any[] }) => Promise<string>;
    invoke?: (
      messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>,
      options?: { signal?: AbortSignal },
    ) => Promise<{ content?: unknown } | string>;
    invokeJson?: <T extends object>(
      input: { messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }> },
      schema?: Record<string, any>,
    ) => Promise<T>;
  };
  if (typeof candidate.generatePlan !== "function" && typeof candidate.invokeJson !== "function") {
    throw new AgentRuntimeError(
      "Agent model does not support structured plan generation",
      "AGENT_MODEL_PLAN_UNSUPPORTED",
      "Agent model cannot generate a structured tool plan",
      500,
    );
  }

  return {
    routeIntent: async (input: { messages: any[]; schema: Record<string, any> }) => {
      if (typeof candidate.routeIntent === "function") return candidate.routeIntent(input);
      if (typeof candidate.invokeJson === "function") return candidate.invokeJson(input, input.schema);
      if (typeof candidate.invoke === "function") {
        const response = await candidate.invoke(input.messages);
        const content = typeof response === "string" ? response : response?.content;
        return JSON.parse(typeof content === "string" ? content : "");
      }
      throw new AgentRuntimeError(
        "Agent model does not support intent routing",
        "AGENT_MODEL_INTENT_UNSUPPORTED",
        "Agent model cannot route intent",
        500,
      );
    },
    generatePlan: (input: { messages: any[]; schema: Record<string, any> }) =>
      typeof candidate.generatePlan === "function"
        ? candidate.generatePlan(input)
        : candidate.invokeJson!(input, input.schema),
    repairPlanStep: (input: {
      plan: unknown;
      step: unknown;
      error: unknown;
      outputs: Record<string, unknown>;
      schema: Record<string, any>;
    }) =>
      {
        const messages: AgentGraphMessage[] = [
          { role: "system", content: "Return JSON only with { params }. Repair only the failed tool parameters." },
          { role: "user", content: JSON.stringify(input) },
        ];
        const schema = {
          type: "object",
          required: ["params"],
          properties: { params: { type: "object" } },
        };
        return typeof candidate.repairPlanStep === "function"
          ? candidate.repairPlanStep({ messages }, schema)
          : candidate.invokeJson!({ messages }, schema);
      },
    generateFinalResponse: async (input: { messages: any[] }) => {
      if (typeof candidate.generateFinalResponse === "function") return candidate.generateFinalResponse(input);
      if (typeof candidate.invoke === "function") {
        const response = await candidate.invoke(input.messages);
        if (typeof response === "string") return response;
        return typeof response?.content === "string" ? response.content : "";
      }
      throw new AgentRuntimeError(
        "Agent model does not support final response generation",
        "AGENT_MODEL_FINAL_UNSUPPORTED",
        "Agent model cannot generate a final response",
        500,
      );
    },
  };
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

function formatConfiguredToolsAnswer(tools: SailorAgentToolDefinition[]): string {
  if (!tools.length) return "Nao tenho ferramentas configuradas para este agente no momento.";

  const lines = tools.map((tool) => {
    const owner = tool.pluginName ? `${tool.pluginName}: ` : "";
    return `- ${owner}${tool.description || tool.name}`;
  });
  return ["Tenho acesso a estas ferramentas configuradas:", ...lines].join("\n");
}
