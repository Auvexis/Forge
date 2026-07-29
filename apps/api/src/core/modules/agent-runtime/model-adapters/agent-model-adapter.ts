export interface AgentModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

export interface AgentModelInvokeInput {
  model: string;
  messages: AgentModelMessage[];
  baseUrl?: string;
  credentials?: Record<string, string>;
  temperature?: number;
  maxTokens?: number;
  numCtx?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  seed?: number;
  keepAlive?: string | number;
  ollamaOptions?: Record<string, any>;
  thinkingEnabled?: boolean;
  thinkingRequest?: Record<string, any>;
  abortSignal?: AbortSignal;
}

export interface AgentModelAdapter {
  invokeText(input: AgentModelInvokeInput): Promise<string>;
  invokeJson<T extends object>(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<T>;
  generateFinalResponse(input: AgentModelInvokeInput): Promise<string>;
}
