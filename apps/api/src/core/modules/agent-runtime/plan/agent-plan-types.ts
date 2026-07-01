import type { AgentRunToolCall, AgentToolSideEffect } from "../agent-types.ts";

export interface AgentPlan {
  steps: AgentPlanStep[];
}

export interface AgentPlanStep {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  reason?: string;
}

export interface AgentToolSelection {
  path: string;
  labelFields: string[];
  valueField: string;
  mode: "single" | "multiple";
}

export interface AgentPlanTool {
  name: string;
  description: string;
  instructions?: string;
  pluginId?: string;
  pluginName?: string;
  methodId?: string;
  sideEffect?: AgentToolSideEffect;
  requiresApproval: boolean;
  inputSchema: Record<string, any>;
  timeoutMs: number;
  selection?: AgentToolSelection;
  invoke(args: unknown): Promise<unknown>;
}

export interface AgentPlanEvent {
  type:
    | "agent:tool-intent"
    | "agent:tool-start"
    | "agent:tool-end"
    | "agent:tool-retry"
    | "agent:approval-created"
    | "agent:error";
  payload?: Record<string, any>;
}

export interface AgentPlanExecutionResult {
  status: "success" | "failed" | "waiting-user" | "waiting-approval" | "cancelled";
  output: unknown;
  toolCallCount: number;
  iterationCount: number;
  toolCalls?: AgentRunToolCall[];
  approvalId?: string;
  outputs?: Record<string, unknown>;
}

export interface AgentStepRepair {
  params: Record<string, unknown>;
}
