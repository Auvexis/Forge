export interface AgentModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface AgentModelInvokeInput {
  model: string;
  messages: AgentModelMessage[];
  baseUrl?: string;
  credentials?: Record<string, string>;
  temperature?: number;
  maxTokens?: number;
  thinkingEnabled?: boolean;
  thinkingRequest?: Record<string, any>;
  abortSignal?: AbortSignal;
}

export interface AgentToolPlan {
  action: "call_tool" | "ask_user" | "final";
  toolName?: string;
  reason?: string;
  question?: string;
  options?: unknown[];
  message?: string;
}

export interface AgentModelAdapter {
  invokeText(input: AgentModelInvokeInput): Promise<string>;
  invokeJson<T extends object>(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<T>;
  invokeToolPlan(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<AgentToolPlan>;
}
