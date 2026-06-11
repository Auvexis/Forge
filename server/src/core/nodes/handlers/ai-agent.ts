import { AgentRuntimeService } from "../../modules/agent-runtime/agent-runtime-service.ts";
import { validateAiAgentConfig, validateAiModelConfig } from "../../modules/agent-runtime/agent-validation.ts";
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
  RetrieverNode,
  VectorStoreNode,
  AiToolNode,
  WorkflowNode,
} from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";
import type { NodeHandlerInput } from "../types.ts";
import { TemplateEngine } from "../../modules/workflows/template-engine.ts";
import { usesShortTermMemory } from "../../modules/agent-runtime/memory/agent-memory-mode.ts";
import { CancellationRegistry } from "../../modules/workflows/cancellation-registry.ts";
import { sailorHomePaths } from "../../runtime/sailor-home.ts";
import { resolveAgentChatMemoryPath } from "../../modules/agent-runtime/chat/agent-chat-paths.ts";

type AgentConfigNode = AiModelNode | AiMemoryNode | AiToolNode | RetrieverNode | VectorStoreNode;

export const aiAgentNodeHandler = createNodeHandler<AiAgentNode>("ai-agent", async (input) => {
  const agentConfig = toAgentConfig(input.node, input.context);
  const connected = findConnectedConfigNodes(input);
  const model = connected.find((node): node is AiModelNode => node.type === "ai-model");
  if (!model) {
    throw new Error("AI Agent requires one connected AI Model node");
  }

  const memory = connected.find((node): node is AiMemoryNode => node.type === "ai-memory");
  const tools = connected.filter((node): node is AiToolNode => node.type === "ai-tool");
  const retrievers = connected.filter((node): node is RetrieverNode => node.type === "retriever");
  const vectorStores = connected.filter((node): node is VectorStoreNode => node.type === "vector-store");
  const triggerPayload = input.context.trigger ?? {};
  const sessionId = optionalString(triggerPayload.sessionId ?? triggerPayload.session_id);
  const memoryConfig = memory ? toMemoryConfig(memory) : undefined;
  const contextMessages = [
    ...(usesShortTermMemory(memoryConfig) && sessionId
      ? toContextMessages(triggerPayload.messages ?? triggerPayload.history ?? triggerPayload.contextMessages) ?? []
      : []),
    ...toRetrievalContextMessages(input, [...retrievers, ...vectorStores]),
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
    checkpointerDbPath: resolveCheckpointerDbPath(profileId, sessionId, memoryConfig),
    triggerPayload,
    skipFinalResponseAfterToolUse: triggerPayload.skipFinalResponseAfterToolUse === true,
    approvalToken: optionalString(triggerPayload.approvalToken ?? triggerPayload.approval_token),
    approvalToolName: optionalString(triggerPayload.approvalToolName ?? triggerPayload.approval_tool_name),
    approvalToolArgs: optionalRecord(triggerPayload.approvalToolArgs ?? triggerPayload.approval_tool_args),
    approvalToolResumeState: triggerPayload.approvalToolResumeState ?? triggerPayload.approval_tool_resume_state,
    abortSignal: CancellationRegistry.signal(input.executionId),
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
  inputs: ["trigger", "ai-model", "ai-memory", "ai-tool", "vector-store", "retriever"],
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

function resolveCheckpointerDbPath(
  profileId: string,
  sessionId: string | undefined,
  memory: AiMemoryNodeConfig | undefined,
): string | undefined {
  if (!sessionId || !usesShortTermMemory(memory) || memory?.adapter !== "sailor-internal") return undefined;
  return resolveAgentChatMemoryPath({
    profilesDir: sailorHomePaths.profilesDir,
    profileId,
    chatId: sessionId,
  });
}

function isAgentConfigNode(node: WorkflowNode | undefined): node is AgentConfigNode {
  return node?.type === "ai-model" ||
    node?.type === "ai-memory" ||
    node?.type === "ai-tool" ||
    node?.type === "vector-store" ||
    node?.type === "retriever";
}

function toAgentConfig(node: AiAgentNode, context: NodeHandlerInput["context"]): AiAgentNodeConfig {
  return validateAiAgentConfig({
    type: "ai-agent",
    name: node.name,
    prompt: String(TemplateEngine.evaluate(node.prompt, context, { escape: "prompt" })),
    executionMode: node.executionMode,
    maxIterations: node.maxIterations,
    maxToolCalls: node.maxToolCalls,
    maxRetriesPerTool: node.maxRetriesPerTool,
    timeoutMs: node.timeoutMs,
    requireApprovalForSideEffects: node.requireApprovalForSideEffects,
    outputMode: node.outputMode,
    outputSchema: node.outputSchema,
  });
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

function toRetrievalContextMessages(
  input: NodeHandlerInput<AiAgentNode>,
  retrievalNodes: Array<RetrieverNode | VectorStoreNode>,
): NonNullable<AgentRunInput["contextMessages"]> {
  const messages: NonNullable<AgentRunInput["contextMessages"]> = [];

  for (const retrievalNode of retrievalNodes) {
    const sourceId = Object.entries(input.workflow.nodes)
      .find(([, node]) => node === retrievalNode)?.[0];
    if (!sourceId) continue;

    const output = input.context.steps[sourceId]?.output;
    const context = output && typeof output === "object"
      ? (output as Record<string, any>).context
      : undefined;
    const content = typeof context === "string" && context.trim()
      ? context.trim()
      : retrieverItemsToContext(output);

    if (content) {
      messages.push({ role: "system", content: `Retrieved context:\n${content}` });
    }
  }

  return messages;
}

function retrieverItemsToContext(output: unknown): string {
  if (!output || typeof output !== "object" || Array.isArray(output)) return "";
  const items = (output as Record<string, unknown>).items;
  if (!Array.isArray(items)) return "";

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const text = (item as Record<string, unknown>).text;
      return typeof text === "string" ? text.trim() : "";
    })
    .filter(Boolean)
    .join("\n\n");
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
