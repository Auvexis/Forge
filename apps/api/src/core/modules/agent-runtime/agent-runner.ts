import { randomUUID } from "node:crypto";
import type { AgentRuntimeEvent } from "./agent-types.ts";
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
import { toAgentRuntimeModel, withAgentModelTimeout } from "./agent-runtime-model.ts";
import { InternalMcpClient } from "./mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "./mcp/internal-mcp-server.ts";
import type { InternalMcpTool } from "./mcp/internal-mcp-types.ts";
import { AgentRuntimeLogger } from "./observability/agent-runtime-logger.ts";
import type { AgentRuntimeStateLifecycle } from "./persistence/agent-runtime-state-store.ts";
import type { AgentPendingInteraction } from "./contracts/agent-domain-contracts.ts";
import { routePendingInteractionReply } from "./interactions/pending-interaction-router.ts";
import type { AgentArtifactService } from "./artifacts/agent-artifact-service.ts";
import type { AgentSideEffectService } from "./idempotency/agent-side-effect-service.ts";
import {
  compactAgentConversation,
  conversationBudgetChars,
} from "./conversation/agent-conversation-compactor.ts";
import type { AgentModelMessage } from "./model-adapters/agent-model-adapter.ts";
import { agentRuntimeMetrics } from "./observability/agent-runtime-metrics.ts";
import { runIterativeMcpAgentLoop } from "./loop/iterative-mcp-agent-loop.ts";
import type { AgentSessionWriter } from "./session/agent-session-writer.ts";
import type { AgentInteractionPart } from "./session/agent-session-contracts.ts";
import type { AgentCommitmentPart } from "./session/agent-session-contracts.ts";
import type { AgentToolPart } from "./session/agent-session-contracts.ts";
import { AgentProcessorPause } from "./processor/agent-processor-pause.ts";

export interface AgentRunnerOptions {
  modelRegistry?: Pick<AgentModelProviderRegistry, "createChatModel">;
  toolRegistry?: Pick<AgentToolRegistry, "listAvailableTools" | "resolveConfiguredTools">;
  pluginMemoryExecutor?: PluginMemoryExecutor;
  toolExecutor?: typeof executePluginAgentTool;
  emitEvent?: (event: AgentRuntimeEvent, input: AgentRunInput) => void;
  stateStoreFactory?: () => AgentRuntimeStateLifecycle;
  artifactServiceFactory?: () => AgentArtifactService;
  sideEffectServiceFactory?: () => AgentSideEffectService;
  sessionWriterFactory?: (
    input: AgentRunInput,
    runId: string,
  ) => {
    writer: AgentSessionWriter;
    turnId: string;
    pendingInteraction?: AgentInteractionPart;
    commitmentPart?: AgentCommitmentPart;
  } | undefined;
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
  private readonly artifactServiceFactory?: AgentRunnerOptions["artifactServiceFactory"];
  private readonly sideEffectServiceFactory?: AgentRunnerOptions["sideEffectServiceFactory"];
  private readonly sessionWriterFactory?: AgentRunnerOptions["sessionWriterFactory"];

  constructor(options: AgentRunnerOptions = {}) {
    this.modelRegistry = options.modelRegistry ?? new AgentModelProviderRegistry();
    this.toolRegistry = options.toolRegistry ?? new AgentToolRegistry();
    this.pluginMemoryExecutor = options.pluginMemoryExecutor ?? defaultPluginMemoryExecutor;
    this.toolExecutor = options.toolExecutor ?? executePluginAgentTool;
    this.eventEmitter = options.emitEvent ?? defaultEventEmitter;
    this.stateStoreFactory = options.stateStoreFactory;
    this.artifactServiceFactory = options.artifactServiceFactory;
    this.sideEffectServiceFactory = options.sideEffectServiceFactory;
    this.sessionWriterFactory = options.sessionWriterFactory;
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const deadline = createRunDeadline(input.abortSignal, input.agent.timeoutMs);
    try {
      return await this.runWithinDeadline({ ...input, abortSignal: deadline.signal });
    } finally {
      deadline.dispose();
    }
  }

  private async runWithinDeadline(input: AgentRunInput): Promise<AgentRunResult> {
    const validated = validateRunInput(input);
    const state = this.stateStoreFactory?.();
    const artifacts = this.artifactServiceFactory?.();
    const sideEffects = this.sideEffectServiceFactory?.();
    const pending = state?.findPendingInteraction(input) ?? null;
    const runId = pending?.runId ?? `run_${randomUUID()}`;
    let sessionExecution: ReturnType<NonNullable<AgentRunnerOptions["sessionWriterFactory"]>>;
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
      sessionExecution = this.sessionWriterFactory?.(input, runId);
      const reply = routePendingInteractionReply(pending, input.userMessage);
      if (reply.type === "cancel" || (reply.type === "confirm" && !reply.confirmed)) {
        state?.cancelPendingInteraction(input.profileId, pending.id);
        state?.markRunCancelled();
        if (sessionExecution?.pendingInteraction) {
          sessionExecution.writer.cancelInteraction(sessionExecution.pendingInteraction);
          sessionExecution.writer.updateTurn(sessionExecution.turnId, "cancelled");
        }
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
      if (sessionExecution?.pendingInteraction) {
        sessionExecution.writer.resolveInteraction(sessionExecution.pendingInteraction, reply);
        sessionExecution.writer.updateTurn(sessionExecution.turnId, "running");
      }
      logger.info("interaction.resolved", { interactionId: pending.id, resolution: reply.type });
    } else {
      state?.startRun(runId, input);
      state?.markRunRunning();
      sessionExecution = this.sessionWriterFactory?.(input, runId);
      if (
        input.approvalToken === "approved" &&
        sessionExecution?.pendingInteraction?.kind === "approval"
      ) {
        sessionExecution.writer.resolveInteraction(
          sessionExecution.pendingInteraction,
          { approved: true },
        );
        sessionExecution.writer.updateTurn(sessionExecution.turnId, "running");
      }
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
      const contextMessages = compactAgentConversation(
        [
          ...memoryMessages,
          ...(validated.contextMessages ?? []),
          ...pendingContextMessages(pending),
        ],
        conversationBudgetChars(validated.model.numCtx),
      );
      const result = await this.runMcpRuntime({
        input,
        validated,
        model,
        tools,
        contextMessages,
        logger,
        state,
        pending,
        artifacts,
        runId,
        sideEffects,
        sessionWriter: sessionExecution?.writer,
        sessionTurnId: sessionExecution?.turnId,
        commitmentPart: sessionExecution?.commitmentPart,
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
      if (isUserCancellation(input.abortSignal)) {
        state?.markRunCancelled();
        if (sessionExecution) {
          sessionExecution.writer.updateTurn(sessionExecution.turnId, "cancelled");
        }
        logger.info("run.completed", { status: "cancelled", toolCallCount: 0, iterationCount: 1 });
        return {
          status: "cancelled",
          output: "OperaÃ§Ã£o cancelada.",
          iterationCount: 1,
          toolCallCount: 0,
          toolCalls: [],
        };
      }
      if (error instanceof AgentProcessorPause) {
        const interactionId = `interaction_${randomUUID()}`;
        state?.createPendingInteraction({
          id: interactionId,
          kind: error.kind,
          question: error.question,
          context: {
            source: "processor",
            toolName: error.toolName,
            error: error.error,
            originalUserMessage: input.userMessage,
          },
        });
        state?.markRunWaitingUser();
        if (sessionExecution) {
          const message = sessionExecution.writer.appendMessage(
            sessionExecution.turnId,
            "assistant",
          );
          sessionExecution.writer.appendInteraction({
            turnId: sessionExecution.turnId,
            messageId: message.id,
            interactionId,
            kind: error.kind,
            question: error.question,
          });
          sessionExecution.writer.updateTurn(sessionExecution.turnId, "waiting-user");
        }
        logger.info("interaction.created", {
          interactionId,
          kind: error.kind,
          toolName: error.toolName,
        });
        return {
          status: "waiting-user",
          output: { status: "waiting-user", question: error.question },
          iterationCount: 1,
          toolCallCount: 0,
          toolCalls: [],
        };
      }
      if (error instanceof AgentToolApprovalRequiredError) {
        state?.markRunWaitingApproval();
        if (sessionExecution) {
          const message = sessionExecution.writer.appendMessage(
            sessionExecution.turnId,
            "assistant",
          );
          sessionExecution.writer.appendInteraction({
            turnId: sessionExecution.turnId,
            messageId: message.id,
            kind: "approval",
            question: `Autorizar ${error.approvalRequest.toolName}?`,
          });
          sessionExecution.writer.updateTurn(sessionExecution.turnId, "waiting-approval");
        }
        logger.info("approval.requested", { toolName: error.approvalRequest.toolName });
        throw error;
      }
      state?.markRunFailed();
      if (sessionExecution) {
        const snapshot = sessionExecution.writer.currentRevision;
        if (snapshot > 0) {
          sessionExecution.writer.updateTurn(sessionExecution.turnId, "failed");
        }
      }
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
    contextMessages: AgentModelMessage[];
    logger: AgentRuntimeLogger;
    state?: AgentRuntimeStateLifecycle;
    pending?: AgentPendingInteraction | null;
    artifacts?: AgentArtifactService;
    runId: string;
    sideEffects?: AgentSideEffectService;
    sessionWriter?: AgentSessionWriter;
    sessionTurnId?: string;
    commitmentPart?: AgentCommitmentPart;
  }): Promise<AgentRunResult> {
    const model = withAgentModelTimeout(
      toAgentRuntimeModel(input.model),
      Math.min(
        input.validated.agent.timeoutMs,
        AGENT_LIMITS.defaultModelTimeoutMs,
      ),
      input.input.abortSignal,
    );
    const server = new InternalMcpServer(
      input.tools,
      input.artifacts
        ? {
            resolveArguments: async (arguments_) =>
              await input.artifacts!.resolveReferences(
                input.input.profileId,
                arguments_,
              ) as Record<string, unknown>,
            captureResult: async (call, content) =>
              await input.artifacts!.captureResult({
                profileId: input.input.profileId,
                runId: input.runId,
                actionId: call.actionId,
                toolName: call.name,
                value: content,
              }),
          }
        : undefined,
      input.sideEffects
        ? {
            execute: async ({ call, timeoutMs, invoke }) =>
              await input.sideEffects!.execute({
                profileId: input.input.profileId,
                runId: input.runId,
                actionId: call.actionId!,
                toolName: call.name,
                arguments: call.arguments,
                leaseMs: timeoutMs + 5_000,
                invoke,
              }),
          }
        : undefined,
    );
    const client = new InternalMcpClient(server);
    if (input.state) {
      try {
        const snapshotStatus = input.state.bindToolCatalogSnapshot(client.snapshot({
          profileId: input.input.profileId,
          workflowId: input.input.workflowId,
          nodeId: input.input.nodeId,
        }));
        if (snapshotStatus === "created") {
          agentRuntimeMetrics.increment("mcp_catalog_snapshot_created");
          input.logger.info("mcp.catalog_snapshotted", { toolCount: input.tools.length });
        } else {
          agentRuntimeMetrics.increment("mcp_catalog_snapshot_verified");
          input.logger.info("mcp.catalog_verified", { toolCount: input.tools.length });
        }
      } catch (error) {
        agentRuntimeMetrics.increment("mcp_catalog_isolation_rejected");
        input.logger.warn("mcp.catalog_rejected", { reason: safeErrorMessage(error) });
        throw error;
      }
    }
    const toolParts = new Map<string, AgentToolPart>();
    const result = await runIterativeMcpAgentLoop({
      model,
      client,
      systemPrompt: input.validated.agent.prompt,
      userMessage: input.input.userMessage,
      contextMessages: input.contextMessages,
      maxToolCalls: input.validated.agent.maxToolCalls,
      abortSignal: input.input.abortSignal,
      logger: input.logger,
      emitEvent: (event) => {
        this.eventEmitter(event, input.input);
        persistLoopEvent(input.sessionWriter, input.sessionTurnId, toolParts, event);
      },
    });
    if (result.status === "waiting-user") {
      const question = waitingQuestion(result.output);
      input.state?.createPendingInteraction({
        id: `interaction_${randomUUID()}`,
        kind: "clarification",
        question,
        context: {
          source: "iterative-loop",
          originalUserMessage: input.input.userMessage,
        },
      });
      if (input.sessionWriter && input.sessionTurnId) {
        const message = input.sessionWriter.appendMessage(input.sessionTurnId, "assistant");
        input.sessionWriter.appendInteraction({
          turnId: input.sessionTurnId,
          messageId: message.id,
          kind: "clarification",
          question,
        });
        input.sessionWriter.updateTurn(input.sessionTurnId, "waiting-user");
      }
      return result;
    }
    persistAgentText(
      input.sessionWriter,
      input.sessionTurnId,
      typeof result.output === "string" ? result.output : JSON.stringify(result.output),
      "completed",
    );
    return result;
  }
}

function persistAgentText(
  writer: AgentSessionWriter | undefined,
  turnId: string | undefined,
  text: string,
  state: "completed" | "waiting-user",
): void {
  if (!writer || !turnId || !text.trim()) return;
  const message = writer.appendMessage(turnId, "assistant");
  writer.appendText({ turnId, messageId: message.id, text: text.trim() });
  writer.updateTurn(turnId, state);
}

function persistLoopEvent(
  writer: AgentSessionWriter | undefined,
  turnId: string | undefined,
  parts: Map<string, AgentToolPart>,
  event: AgentRuntimeEvent,
): void {
  if (!writer || !turnId) return;
  const payload = event.payload ?? {};
  const callId = typeof payload.callId === "string" ? payload.callId : "";
  if (!callId) return;

  if (event.type === "agent:tool-intent") {
    const message = writer.appendMessage(turnId, "assistant");
    const part = writer.appendTool({
      turnId,
      messageId: message.id,
      callId,
      toolName: String(payload.name ?? "tool"),
      ...(typeof payload.actionId === "string" ? { actionId: payload.actionId } : {}),
      ...(payload.params && typeof payload.params === "object"
        ? { arguments: payload.params as Record<string, unknown> }
        : {}),
    });
    parts.set(callId, part);
    return;
  }

  const current = parts.get(callId);
  if (!current) return;
  if (event.type === "agent:tool-start") {
    const input = (current.state.status === "pending" && current.state.input
      ? current.state.input
      : {}) as Record<string, unknown>;
    parts.set(callId, writer.startTool(current, input));
    return;
  }
  if (event.type !== "agent:tool-end") return;

  const running = current.state.status === "running"
    ? current
    : writer.startTool(
        current,
        (current.state.status === "pending" && current.state.input
          ? current.state.input
          : {}) as Record<string, unknown>,
      );
  if (payload.status === "success") {
    parts.set(callId, writer.completeTool(running, payload.output));
    return;
  }
  parts.set(callId, writer.failTool(running, {
    code: "AGENT_TOOL_FAILED",
    category: "internal",
    message: safeErrorMessage(payload.error),
    retryable: false,
    userActionRequired: false,
  }));
}

function waitingQuestion(output: AgentRunResult["output"]): string {
  if (output && typeof output === "object" && "question" in output) {
    const question = String(output.question ?? "").trim();
    if (question) return question;
  }
  return "Preciso de uma informação adicional para continuar.";
}

function isUserCancellation(signal?: AbortSignal): boolean {
  if (!signal?.aborted) return false;
  const reason = signal.reason;
  return !(reason instanceof AgentRuntimeError && reason.code === "AGENT_RUN_TIMEOUT");
}

function createRunDeadline(
  upstream: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const onAbort = () => controller.abort(upstream?.reason);
  upstream?.addEventListener("abort", onAbort, { once: true });
  if (upstream?.aborted) onAbort();
  const timeout = setTimeout(() => {
    controller.abort(new AgentRuntimeError(
      `Agent run timed out after ${timeoutMs}ms`,
      "AGENT_RUN_TIMEOUT",
      "Agent execution timed out",
      504,
    ));
  }, timeoutMs);
  timeout.unref?.();
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      upstream?.removeEventListener("abort", onAbort);
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
