export type AgentMemoryScope = "none" | "session" | "workflow" | "profile" | "user";

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
  provider: "openai" | "openrouter";
  model: string;
  temperature: number;
  maxTokens?: number;
  credentialId?: string;
  baseUrl?: string;
}

export interface AiMemoryNodeConfig {
  type: "ai-memory";
  name: string;
  scope: AgentMemoryScope;
  readEnabled: boolean;
  writeEnabled: boolean;
  maxRetrievedMemories: number;
  maxMemoryChars: number;
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
  | "waiting-approval";

export type AgentEventType =
  | "agent:start"
  | "agent:model-start"
  | "agent:model-end"
  | "agent:tool-start"
  | "agent:tool-end"
  | "agent:memory-read"
  | "agent:memory-write"
  | "agent:approval-created"
  | "agent:approval-resumed"
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
  checkpointerDbPath?: string;
  userMessage: string;
  triggerPayload: Record<string, any>;
  agent: AiAgentNodeConfig;
  model: AiModelNodeConfig;
  memory?: AiMemoryNodeConfig;
  tools: AiToolNodeConfig[];
}

export interface AgentRunResult {
  status: AgentRunStatus;
  output: string | Record<string, any>;
  toolCallCount: number;
  iterationCount: number;
  approvalId?: string;
}
