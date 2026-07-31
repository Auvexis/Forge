export type AgentMemoryScope = "none" | "session" | "workflow" | "profile" | "user";
export type AgentMemoryAdapter = "fabric-internal" | "plugin-memory-store";

export type AgentModelAdapter = "openai-compatible" | "generic" | "ollama";
export type AgentExecutionMode = "loop";

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
  executionMode: AgentExecutionMode;
  maxToolCalls: number;
  /** Retry budget for transient/rate-limit tool failures only. */
  maxRetriesPerTool: number;
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
  numCtx?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  seed?: number;
  keepAlive?: string | number;
  ollamaOptions?: Record<string, any>;
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

export interface CallableAgentToolConfig {
  name: string;
  description: string;
  instructions?: string;
  inputSchema: Record<string, any>;
  sideEffect: AgentToolSideEffect;
  requiresApproval: boolean;
  timeoutMs: number;
  invoke(args: unknown): Promise<unknown>;
}

export type AgentToolConfig = AiToolNodeConfig | CallableAgentToolConfig;

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
  | "agent:error"
  | "agent:end";

export interface AgentRuntimeEvent {
  type: AgentEventType;
  payload?: Record<string, any>;
}

export interface AgentRunInput {
  profileId: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  sessionId?: string;
  userId?: string;
  approvalToken?: string;
  approvalToolName?: string;
  approvalToolArgs?: Record<string, any>;
  approvalToolResumeState?: unknown;
  abortSignal?: AbortSignal;
  userMessage: string;
  contextMessages?: AgentModelMessage[];
  runScratchpadMessages?: AgentModelMessage[];
  triggerPayload: Record<string, any>;
  skipFinalResponseAfterToolUse?: boolean;
  agent: AiAgentNodeConfig;
  model: AiModelNodeConfig;
  memory?: AiMemoryNodeConfig;
  tools: AgentToolConfig[];
}

export interface AgentRunResult {
  status: AgentRunStatus;
  output: string | Record<string, any>;
  toolCallCount: number;
  toolCalls?: AgentRunToolCall[];
  iterationCount: number;
  approvalId?: string;
  conversationMessages?: AgentModelMessage[];
  stopReason?:
    | "final-response"
    | "interaction-required"
    | "tool-error"
    | "model-error"
    | "tool-call-limit"
    | "iteration-limit"
    | "cancelled";
}

export interface AgentRunToolCall {
  toolCallId: string;
  name: string;
  pluginId?: string;
  pluginName?: string;
  status: "success" | "failed" | "waiting-approval";
}
import type { AgentModelMessage } from "./model-adapters/agent-model-adapter.ts";
