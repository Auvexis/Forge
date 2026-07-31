import type { AgentRunToolCall, AgentToolSideEffect } from "../agent-types.ts";

export interface InternalMcpTool {
  name: string;
  summary: string;
  instructions?: string;
  pluginId?: string;
  pluginName?: string;
  methodId?: string;
  sideEffect?: AgentToolSideEffect;
  requiresApproval: boolean;
  timeoutMs: number;
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
  invoke(arguments_: Record<string, unknown>): Promise<unknown>;
}

export interface InternalMcpToolCard {
  name: string;
  summary: string;
  aliases?: string[];
  sideEffect: AgentToolSideEffect;
}

export interface InternalMcpToolCall {
  id: string;
  actionId?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface InternalMcpToolResult {
  call: InternalMcpToolCall;
  content: unknown;
  toolCall: AgentRunToolCall;
}
