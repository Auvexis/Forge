import type { AgentPlan, AgentStepRepair } from "../plan/agent-plan-types.ts";

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

export interface AgentModelAdapter {
  invokeText(input: AgentModelInvokeInput): Promise<string>;
  invokeJson<T extends object>(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<T>;
  generatePlan(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<AgentPlan>;
  repairPlanStep(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<AgentStepRepair>;
  generateFinalResponse(input: AgentModelInvokeInput): Promise<string>;
}
