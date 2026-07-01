import type { AgentGraphEvent } from "../agent-graph-builder.ts";
import type { AgentRunInput, AgentRunResult } from "../agent-types.ts";
import { routeAgentIntent } from "../intent/agent-intent-router.ts";
import { toAgentRuntimeModel } from "../agent-runtime-model.ts";
import { generateAgentFinalResponse } from "./agent-final-response-generator.ts";
import { executeAgentPlan } from "./agent-plan-executor.ts";
import { generateAgentPlan } from "./agent-plan-generator.ts";
import { createAgentPlanRepairer } from "./agent-plan-repairer.ts";
import type { AgentPlan, AgentPlanTool } from "./agent-plan-types.ts";

export interface RunAgentPlanRuntimeInput {
  input: AgentRunInput;
  model: unknown;
  tools: AgentPlanTool[];
  contextMessages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  maxRetriesPerTool: number;
  emitEvent: (event: AgentGraphEvent) => void;
}

export async function runAgentPlanRuntime(input: RunAgentPlanRuntimeInput): Promise<AgentRunResult> {
  const model = toAgentRuntimeModel(input.model);
  const resumeState = normalizePlanResumeState(input.input.approvalToolResumeState);
  if (input.input.approvalToken && resumeState) {
    return runResumedAgentPlanRuntime(input, model, resumeState);
  }

  const intent = await routeAgentIntent({
    model,
    userMessage: input.input.userMessage,
    contextMessages: input.contextMessages,
    tools: input.tools,
  });
  if (intent.mode === "chat") {
    const output = intent.answer?.trim() || await generateAgentFinalResponse({
      model,
      userMessage: input.input.userMessage,
      plan: { steps: [] },
      execution: {
        status: "success",
        output: "",
        outputs: {},
        toolCalls: [],
        toolCallCount: 0,
        iterationCount: 1,
      },
    });
    return {
      status: "success",
      output,
      toolCallCount: 0,
      iterationCount: 1,
      toolCalls: [],
    };
  }

  const plan = await generateAgentPlan({
    model,
    userMessage: input.input.userMessage,
    tools: input.tools,
    saveMessage: (message) => {
      input.emitEvent({ type: "agent:thinking", payload: { message } } as AgentGraphEvent);
    },
    requireToolPlan: true,
  });
  if (plan.steps.length > 0) {
    input.emitEvent({ type: "agent:plan-start", payload: {} } as AgentGraphEvent);
    input.emitEvent({ type: "agent:plan-end", payload: { steps: plan.steps.length } } as AgentGraphEvent);
  }

  const repairer = createAgentPlanRepairer({
    model,
    saveMessage: (message) => {
      input.emitEvent({ type: "agent:repair-start", payload: { message } } as AgentGraphEvent);
    },
  });
  const result = await executeAgentPlan({
    plan,
    tools: input.tools,
    maxRetriesPerStep: input.maxRetriesPerTool,
    executionId: input.input.executionId,
    approval: input.input.approvalToken
      ? {
          status: input.input.approvalToken === "approved" ? "approved" : "rejected",
          toolName: input.input.approvalToolName,
        }
      : undefined,
    emitEvent: (event) => input.emitEvent(event as AgentGraphEvent),
    repairStep: async (repairInput) => {
      input.emitEvent({ type: "agent:repair-start", payload: { stepId: repairInput.step.id } } as AgentGraphEvent);
      const repair = await repairer.repairStep(repairInput);
      input.emitEvent({
        type: "agent:repair-end",
        payload: { stepId: repairInput.step.id, repaired: Boolean(repair) },
      } as AgentGraphEvent);
      return repair ?? { params: repairInput.step.params };
    },
  });
  const output = input.input.skipFinalResponseAfterToolUse
    ? result.output as AgentRunResult["output"]
    : result.status !== "success"
      ? result.output as AgentRunResult["output"]
      : await generateAgentFinalResponse({
          model,
          userMessage: input.input.userMessage,
          plan,
          execution: result,
        });

  return {
    status: result.status === "cancelled" ? "cancelled" : result.status,
    output,
    toolCallCount: result.toolCallCount,
    iterationCount: result.iterationCount,
    toolCalls: result.toolCalls,
    approvalId: result.approvalId,
  };
}

async function runResumedAgentPlanRuntime(
  input: RunAgentPlanRuntimeInput,
  model: ReturnType<typeof toAgentRuntimeModel>,
  resumeState: AgentPlanResumeState,
): Promise<AgentRunResult> {
  const repairer = createAgentPlanRepairer({
    model,
    saveMessage: (message) => {
      input.emitEvent({ type: "agent:repair-start", payload: { message } } as AgentGraphEvent);
    },
  });
  const result = await executeAgentPlan({
    plan: resumeState.plan,
    tools: input.tools,
    maxRetriesPerStep: input.maxRetriesPerTool,
    executionId: input.input.executionId,
    approval: {
      status: input.input.approvalToken === "approved" ? "approved" : "rejected",
      toolName: input.input.approvalToolName,
      stepId: resumeState.stepId,
      outputs: resumeState.outputs,
    },
    emitEvent: (event) => input.emitEvent(event as AgentGraphEvent),
    repairStep: async (repairInput) => {
      input.emitEvent({ type: "agent:repair-start", payload: { stepId: repairInput.step.id } } as AgentGraphEvent);
      const repair = await repairer.repairStep(repairInput);
      input.emitEvent({
        type: "agent:repair-end",
        payload: { stepId: repairInput.step.id, repaired: Boolean(repair) },
      } as AgentGraphEvent);
      return repair ?? { params: repairInput.step.params };
    },
  });
  const output = input.input.skipFinalResponseAfterToolUse
    ? result.output as AgentRunResult["output"]
    : result.status !== "success"
      ? result.output as AgentRunResult["output"]
      : await generateAgentFinalResponse({
          model,
          userMessage: input.input.userMessage,
          plan: resumeState.plan,
          execution: result,
        });

  return {
    status: result.status === "cancelled" ? "cancelled" : result.status,
    output,
    toolCallCount: result.toolCallCount,
    iterationCount: result.iterationCount,
    toolCalls: result.toolCalls,
    approvalId: result.approvalId,
  };
}

interface AgentPlanResumeState {
  plan: AgentPlan;
  stepId: string;
  outputs: Record<string, unknown>;
}

function normalizePlanResumeState(value: unknown): AgentPlanResumeState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!isAgentPlan(record.plan)) return null;
  if (typeof record.stepId !== "string" || !record.stepId.trim()) return null;
  const outputs = record.outputs && typeof record.outputs === "object" && !Array.isArray(record.outputs)
    ? record.outputs as Record<string, unknown>
    : {};
  return {
    plan: record.plan,
    stepId: record.stepId,
    outputs,
  };
}

function isAgentPlan(value: unknown): value is AgentPlan {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Array.isArray((value as { steps?: unknown }).steps),
  );
}
