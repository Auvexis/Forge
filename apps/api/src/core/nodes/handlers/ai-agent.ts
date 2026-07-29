import { AgentRuntimeService } from "../../modules/agent-runtime/agent-runtime-service.ts";
import { validateAiAgentConfig } from "../../modules/agent-runtime/agent-validation.ts";
import type {
  AgentRunInput,
  AiAgentNodeConfig,
  AiMemoryNodeConfig,
} from "../../modules/agent-runtime/agent-types.ts";
import type {
  AiAgentNode,
} from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";
import type { NodeHandlerInput } from "../types.ts";
import { TemplateEngine } from "../../modules/workflows/template-engine.ts";
import { usesShortTermMemory } from "../../modules/agent-runtime/memory/agent-memory-mode.ts";
import { CancellationRegistry } from "../../modules/workflows/cancellation-registry.ts";
import type { AgentToolRef, ChatModelRef, MemoryRef } from "../../modules/ai-services/ai-service-types.ts";
import { ConfigDependencyResolver } from "../dependencies/config-dependency-resolver.ts";
import { createCoreCapabilityAdapterRegistry } from "../dependencies/core-capability-adapters.ts";

export const aiAgentNodeHandler = createNodeHandler<AiAgentNode>("ai-agent", async (input) => {
  const agentConfig = toAgentConfig(input.node, input.context);
  const dependencies = await resolveDependencies(input);
  const model = dependencies.getOne<ChatModelRef>("chatModel");
  const memoryConfig = dependencies.getOptional<MemoryRef>("memory");
  const tools = dependencies.getMany<AgentToolRef>("tool");
  const triggerPayload = input.context.trigger ?? {};
  const sessionId = optionalString(triggerPayload.sessionId ?? triggerPayload.session_id);
  const contextMessages = [
    ...(usesShortTermMemory(memoryConfig) && sessionId
      ? toContextMessages(triggerPayload.messages ?? triggerPayload.history ?? triggerPayload.contextMessages) ?? []
      : []),
  ];
  const profileId = String(triggerPayload.profileId ?? triggerPayload.profile_id ?? "default");
  const runInput: AgentRunInput = {
    profileId,
    workflowId: input.workflow.metadata.id,
    executionId: input.executionId,
    nodeId: input.nodeId,
    sessionId,
    userId: optionalString(triggerPayload.userId ?? triggerPayload.user_id),
    userMessage: toUserMessage(input.node, input.context, triggerPayload),
    contextMessages: contextMessages.length > 0 ? contextMessages : undefined,
    triggerPayload,
    skipFinalResponseAfterToolUse: triggerPayload.skipFinalResponseAfterToolUse === true,
    approvalToken: optionalString(triggerPayload.approvalToken ?? triggerPayload.approval_token),
    approvalToolName: optionalString(triggerPayload.approvalToolName ?? triggerPayload.approval_tool_name),
    approvalToolArgs: optionalRecord(triggerPayload.approvalToolArgs ?? triggerPayload.approval_tool_args),
    approvalToolResumeState: triggerPayload.approvalToolResumeState ?? triggerPayload.approval_tool_resume_state,
    abortSignal: CancellationRegistry.signal(input.executionId),
    agent: agentConfig,
    model: model.configuration,
    memory: memoryConfig,
    tools,
  };

  return AgentRuntimeService.runAgent(runInput);
}, {
  description: "Runs a Fabric AI Agent with connected model, memory, and tool configuration nodes.",
  execution: "external-io",
  sideEffects: ["network", "workflow-dispatch"],
  inputs: ["trigger", "ai-model", "ai-memory", "ai-tool"],
  outputs: [{ id: "default", label: "Output" }],
  errors: ["Missing AI model", "Agent runtime failed"],
  usesExternalIO: true,
});

async function resolveDependencies(input: NodeHandlerInput<AiAgentNode>) {
  if (input.services.resolveConfigDependencies) return input.services.resolveConfigDependencies(input.nodeId);
  return new ConfigDependencyResolver(createCoreCapabilityAdapterRegistry()).resolveForNode(input, input.nodeId);
}

function toAgentConfig(node: AiAgentNode, context: NodeHandlerInput["context"]): AiAgentNodeConfig {
  return validateAiAgentConfig({
    type: "ai-agent",
    name: node.name,
    prompt: String(TemplateEngine.evaluate(node.prompt, context, { escape: "prompt" })),
    executionMode: node.executionMode,
    maxToolCalls: node.maxToolCalls,
    maxRetriesPerTool: node.maxRetriesPerTool,
    timeoutMs: node.timeoutMs,
    requireApprovalForSideEffects: node.requireApprovalForSideEffects,
    outputMode: node.outputMode,
    outputSchema: node.outputSchema,
  });
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalRecord(value: unknown): Record<string, any> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : undefined;
}

function toUserMessage(
  node: AiAgentNode,
  context: NodeHandlerInput["context"],
  triggerPayload: Record<string, any>,
): string {
  if (node.inputMessage && typeof node.inputMessage === "string") {
    const configuredMessage = String(TemplateEngine.evaluate(node.inputMessage, context)).trim();
    if (configuredMessage) return configuredMessage;
  }

  const body = triggerPayload.body && typeof triggerPayload.body === "object"
    ? triggerPayload.body as Record<string, unknown>
    : {};
  const direct = triggerPayload.message ?? triggerPayload.text ?? body.message ?? body.text;
  if (direct !== undefined && direct !== null) return String(direct);
  return JSON.stringify(triggerPayload);
}

function toContextMessages(value: unknown): AgentRunInput["contextMessages"] {
  if (!Array.isArray(value)) return undefined;

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const role = record.role;
      if (role !== "system" && role !== "user" && role !== "assistant" && role !== "tool") return null;
      const content = normalizeMessageContent(record.content);
      const embedded = record.content && typeof record.content === "object" && !Array.isArray(record.content)
        ? record.content as Record<string, unknown>
        : {};
      const source = { ...embedded, ...record };
      const toolCalls = normalizeToolCalls(source.tool_calls);
      if (!content.trim() && toolCalls.length === 0) return null;
      return {
        role,
        content,
        ...(typeof source.name === "string" ? { name: source.name } : {}),
        ...(typeof source.tool_call_id === "string"
          ? { tool_call_id: source.tool_call_id }
          : {}),
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      };
    })
    .filter((message): message is NonNullable<AgentRunInput["contextMessages"]>[number] => Boolean(message));
}

function normalizeToolCalls(value: unknown): Array<{
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.name !== "string") return [];
    const arguments_ = record.arguments;
    if (!arguments_ || typeof arguments_ !== "object" || Array.isArray(arguments_)) return [];
    return [{
      id: record.id,
      name: record.name,
      arguments: arguments_ as Record<string, unknown>,
    }];
  });
}

function normalizeMessageContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.content === "string") return record.content;
  return "";
}
