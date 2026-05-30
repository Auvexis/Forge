import { AgentRuntimeService } from "../../modules/agent-runtime/agent-runtime-service.ts";
import { validateAiModelConfig } from "../../modules/agent-runtime/agent-validation.ts";
import type {
  AgentRunInput,
  AiAgentNodeConfig,
  AiMemoryNodeConfig,
  AiModelNodeConfig,
  AiToolNodeConfig,
} from "../../modules/agent-runtime/agent-types.ts";
import type {
  AiAgentNode,
  AiMemoryNode,
  AiModelNode,
  AiToolNode,
  WorkflowNode,
} from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";
import type { NodeHandlerInput } from "../types.ts";
import { TemplateEngine } from "../../modules/workflows/template-engine.ts";
import { usesShortTermMemory } from "../../modules/agent-runtime/memory/agent-memory-mode.ts";

type AgentConfigNode = AiModelNode | AiMemoryNode | AiToolNode;

export const aiAgentNodeHandler = createNodeHandler<AiAgentNode>("ai-agent", async (input) => {
  const agentConfig = toAgentConfig(input.node, input.context);
  const connected = findConnectedConfigNodes(input);
  const model = connected.find((node): node is AiModelNode => node.type === "ai-model");
  if (!model) {
    throw new Error("AI Agent requires one connected AI Model node");
  }

  const memory = connected.find((node): node is AiMemoryNode => node.type === "ai-memory");
  const tools = connected.filter((node): node is AiToolNode => node.type === "ai-tool");
  const triggerPayload = input.context.trigger ?? {};
  const sessionId = optionalString(triggerPayload.sessionId ?? triggerPayload.session_id);
  const memoryConfig = memory ? toMemoryConfig(memory) : undefined;
  const runInput: AgentRunInput = {
    profileId: String(triggerPayload.profileId ?? triggerPayload.profile_id ?? "default"),
    workflowId: input.workflow.metadata.id,
    executionId: input.executionId,
    nodeId: input.nodeId,
    sessionId,
    userId: optionalString(triggerPayload.userId ?? triggerPayload.user_id),
    userMessage: toUserMessage(triggerPayload),
    contextMessages: usesShortTermMemory(memoryConfig) && sessionId
      ? toContextMessages(triggerPayload.messages ?? triggerPayload.history ?? triggerPayload.contextMessages)
      : undefined,
    triggerPayload,
    approvalToken: optionalString(triggerPayload.approvalToken ?? triggerPayload.approval_token),
    agent: agentConfig,
    model: toModelConfig(model),
    memory: memoryConfig,
    tools: tools.map((tool) => toToolConfig(tool, input.context)),
  };

  return AgentRuntimeService.runAgent(runInput);
}, {
  description: "Runs a Sailor AI Agent with connected model, memory, and tool configuration nodes.",
  execution: "external-io",
  sideEffects: ["network", "workflow-dispatch"],
  inputs: ["trigger", "ai-model", "ai-memory", "ai-tool"],
  outputs: [{ id: "default", label: "Output" }],
  errors: ["Missing AI model", "Agent runtime failed"],
  usesExternalIO: true,
});

function findConnectedConfigNodes(input: NodeHandlerInput<AiAgentNode>): AgentConfigNode[] {
  return input.edges
    .filter((edge) => edge.target === input.nodeId)
    .map((edge) => input.workflow.nodes[edge.source])
    .filter((node): node is AgentConfigNode => isAgentConfigNode(node));
}

function isAgentConfigNode(node: WorkflowNode | undefined): node is AgentConfigNode {
  return node?.type === "ai-model" || node?.type === "ai-memory" || node?.type === "ai-tool";
}

function toAgentConfig(node: AiAgentNode, context: NodeHandlerInput["context"]): AiAgentNodeConfig {
  return {
    type: "ai-agent",
    name: node.name,
    agentDisplayName: node.agentDisplayName,
    agentEmoji: node.agentEmoji,
    agentDescription: node.agentDescription,
    prompt: String(TemplateEngine.evaluate(node.prompt, context, { escape: "prompt" })),
    maxIterations: node.maxIterations,
    maxToolCalls: node.maxToolCalls,
    timeoutMs: node.timeoutMs,
    requireApprovalForSideEffects: node.requireApprovalForSideEffects,
    outputMode: node.outputMode,
    outputSchema: node.outputSchema,
  };
}

function toModelConfig(node: AiModelNode): AiModelNodeConfig {
  const legacyProvider = (node as unknown as { provider?: unknown }).provider;
  const hasPluginModelIdentity = typeof node.pluginId === "string" || typeof node.adapter === "string";

  return validateAiModelConfig({
    type: "ai-model",
    name: node.name,
    ...(hasPluginModelIdentity
      ? { pluginId: node.pluginId, adapter: node.adapter }
      : typeof legacyProvider === "string"
        ? { provider: legacyProvider }
        : { pluginId: node.pluginId, adapter: node.adapter }),
    model: node.model,
    temperature: node.temperature,
    maxTokens: node.maxTokens,
    credentialId: node.credentialId,
    baseUrl: node.baseUrl,
    thinkingEnabled: node.thinkingEnabled,
    thinkingRequest: node.thinkingRequest,
    thinkingSupported: node.thinkingSupported,
  });
}

function toMemoryConfig(node: AiMemoryNode): AiMemoryNodeConfig {
  return {
    type: "ai-memory",
    name: node.name,
    scope: node.scope,
    readEnabled: node.readEnabled,
    writeEnabled: node.writeEnabled,
    maxRetrievedMemories: node.maxRetrievedMemories,
    maxMemoryChars: node.maxMemoryChars,
    adapter: node.adapter,
    pluginId: node.pluginId,
    searchMethodId: node.searchMethodId,
    putMethodId: node.putMethodId,
  };
}

function toToolConfig(node: AiToolNode, context: NodeHandlerInput["context"]): AiToolNodeConfig {
  return {
    type: "ai-tool",
    name: node.name,
    pluginId: node.pluginId,
    methodId: node.methodId,
    descriptionOverride: node.descriptionOverride
      ? String(TemplateEngine.evaluate(node.descriptionOverride, context, { escape: "prompt" }))
      : undefined,
    timeoutMs: node.timeoutMs,
    requiresApproval: node.requiresApproval,
    sideEffect: node.sideEffect,
    inputDefaults: node.inputDefaults
      ? TemplateEngine.evaluate(node.inputDefaults, context) as Record<string, any>
      : undefined,
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toUserMessage(triggerPayload: Record<string, any>): string {
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
      if (!content.trim()) return null;
      return { role, content };
    })
    .filter((message): message is NonNullable<AgentRunInput["contextMessages"]>[number] => Boolean(message));
}

function normalizeMessageContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.content === "string") return record.content;
  return "";
}
