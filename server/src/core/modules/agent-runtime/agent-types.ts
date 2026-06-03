export type AgentMemoryScope = "none" | "session" | "workflow" | "profile" | "user";
export type AgentMemoryAdapter = "sailor-internal" | "plugin-memory-store";

export type AgentModelAdapter = "openai-compatible" | "generic" | "ollama";

export type AgentToolSideEffect =
  | "read"
  | "write"
  | "delete"
  | "external-message"
  | "external-payment"
  | "filesystem";

export interface AiAgentNodeConfig {
  type: "ai-agent";
  name: string;
  prompt: string;
  maxIterations: number;
  maxToolCalls: number;
  timeoutMs: number;
  requireApprovalForSideEffects: AgentToolSideEffect[];
  outputMode: "text" | "json";
  outputSchema?: Record<string, any>;
}

export interface AiModelNodeConfig {
  type: "ai-model";
  name: string;
  pluginId: string;
  adapter: AgentModelAdapter;
  model: string;
  temperature: number;
  maxTokens?: number;
  credentialId?: string;
  baseUrl?: string;
  thinkingEnabled?: boolean;
  thinkingRequest?: Record<string, any>;
  thinkingSupported?: boolean;
}

export interface AiMemoryNodeConfig {
  type: "ai-memory";
  name: string;
  scope: AgentMemoryScope;
  readEnabled: boolean;
  writeEnabled: boolean;
  maxRetrievedMemories: number;
  maxMemoryChars: number;
  adapter?: AgentMemoryAdapter;
  pluginId?: string;
  searchMethodId?: string;
  putMethodId?: string;
}

export interface AiToolNodeConfig {
  type: "ai-tool";
  name: string;
  pluginId: string;
  methodId: string;
  descriptionOverride?: string;
  timeoutMs: number;
  requiresApproval: boolean;
  sideEffect: AgentToolSideEffect;
  inputDefaults?: Record<string, any>;
}

export interface ChatTriggerConfig {
  type: "chat";
  chatSlug: string;
  title: string;
  authMode: "public" | "signed" | "profile";
  sessionMode: "new-session-per-user" | "resume-by-session-id";
  allowedOrigins?: string[];
  rateLimitPerMinute: number;
}

export type AgentRunStatus =
  | "running"
  | "success"
  | "failed"
  | "cancelled"
  | "waiting-user"
  | "waiting-approval";

export type AgentEventType =
  | "agent:start"
  | "agent:config-snapshot"
  | "agent:model-start"
  | "agent:model-end"
  | "agent:output-delta"
  | "agent:thinking-delta"
  | "agent:tool-intent"
  | "agent:tool-start"
  | "agent:tool-retry"
  | "agent:tool-end"
  | "agent:memory-read"
  | "agent:memory-write"
  | "agent:approval-created"
  | "agent:approval-resumed"
  | "agent:thinking"
  | "agent:plan-start"
  | "agent:plan-end"
  | "agent:repair-start"
  | "agent:repair-end"
  | "agent:error"
  | "agent:end";

export interface AgentRunInput {
  profileId: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  sessionId?: string;
  userId?: string;
  approvalToken?: string;
  approvalToolName?: string;
  abortSignal?: AbortSignal;
  checkpointerDbPath?: string;
  userMessage: string;
  contextMessages?: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  triggerPayload: Record<string, any>;
  skipFinalResponseAfterToolUse?: boolean;
  agent: AiAgentNodeConfig;
  model: AiModelNodeConfig;
  memory?: AiMemoryNodeConfig;
  tools: AiToolNodeConfig[];
}

export interface AgentRunResult {
  status: AgentRunStatus;
  output: string | Record<string, any>;
  toolCallCount: number;
  toolCalls?: AgentRunToolCall[];
  iterationCount: number;
  approvalId?: string;
}

export interface AgentRunToolCall {
  toolCallId: string;
  name: string;
  pluginId?: string;
  pluginName?: string;
  status: "success" | "failed";
}
