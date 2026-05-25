import { AgentRuntimeService } from "../../modules/agent-runtime/agent-runtime-service.ts";
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

type AgentConfigNode = AiModelNode | AiMemoryNode | AiToolNode;

export const aiAgentNodeHandler = createNodeHandler<AiAgentNode>("ai-agent", async (input) => {
  const agentConfig = toAgentConfig(input.node);
  const connected = findConnectedConfigNodes(input);
  const model = connected.find((node): node is AiModelNode => node.type === "ai-model");
  if (!model) {
    throw new Error("AI Agent requires one connected AI Model node");
  }

  const memory = connected.find((node): node is AiMemoryNode => node.type === "ai-memory");
  const tools = connected.filter((node): node is AiToolNode => node.type === "ai-tool");
  const triggerPayload = input.context.trigger ?? {};
  const runInput: AgentRunInput = {
    profileId: String(triggerPayload.profileId ?? triggerPayload.profile_id ?? "default"),
    workflowId: input.workflow.metadata.id,
    executionId: input.executionId,
    nodeId: input.nodeId,
    sessionId: optionalString(triggerPayload.sessionId ?? triggerPayload.session_id),
    userId: optionalString(triggerPayload.userId ?? triggerPayload.user_id),
    userMessage: String(triggerPayload.message ?? triggerPayload.text ?? ""),
    triggerPayload,
    agent: agentConfig,
    model: toModelConfig(model),
    memory: memory ? toMemoryConfig(memory) : undefined,
    tools: tools.map(toToolConfig),
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

function toAgentConfig(node: AiAgentNode): AiAgentNodeConfig {
  return {
    type: "ai-agent",
    name: node.name,
    prompt: node.prompt,
    maxIterations: node.maxIterations,
    maxToolCalls: node.maxToolCalls,
    timeoutMs: node.timeoutMs,
    requireApprovalForSideEffects: node.requireApprovalForSideEffects,
    outputMode: node.outputMode,
    outputSchema: node.outputSchema,
  };
}

function toModelConfig(node: AiModelNode): AiModelNodeConfig {
  return {
    type: "ai-model",
    name: node.name,
    provider: node.provider,
    model: node.model,
    temperature: node.temperature,
    maxTokens: node.maxTokens,
    credentialId: node.credentialId,
    baseUrl: node.baseUrl,
  };
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
  };
}

function toToolConfig(node: AiToolNode): AiToolNodeConfig {
  return {
    type: "ai-tool",
    name: node.name,
    pluginId: node.pluginId,
    methodId: node.methodId,
    descriptionOverride: node.descriptionOverride,
    timeoutMs: node.timeoutMs,
    requiresApproval: node.requiresApproval,
    sideEffect: node.sideEffect,
    inputDefaults: node.inputDefaults,
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
