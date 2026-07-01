import { AgentRuntimeError, AgentToolApprovalRequiredError, serializeAgentError } from "../agent-errors.ts";
import type { AgentPlan, AgentPlanStep, AgentPlanTool, AgentStepRepair } from "./agent-plan-types.ts";

export interface AgentPlanRepairModel {
  repairPlanStep(input: {
    plan: AgentPlan;
    step: AgentPlanStep;
    error: { code: string; message: string };
    outputs: Record<string, unknown>;
    schema: Record<string, any>;
  }): Promise<AgentStepRepair>;
}

export interface AgentPlanRepairer {
  repairStep(input: {
    plan: AgentPlan;
    step: AgentPlanStep;
    tool: AgentPlanTool;
    error: unknown;
    outputs: Record<string, unknown>;
  }): Promise<AgentStepRepair | null>;
}

export function createAgentPlanRepairer(options: {
  model: AgentPlanRepairModel;
  saveMessage?: (message: string) => void | Promise<void>;
}): AgentPlanRepairer {
  const repairedStepIds = new Set<string>();

  return {
    async repairStep(input) {
      if (!isRepairableAgentPlanError(input.error)) return null;
      if (repairedStepIds.has(input.step.id)) return null;
      repairedStepIds.add(input.step.id);

      await options.saveMessage?.("Analyzing errors");
      await options.saveMessage?.("Creating new parameters");

      const repair = await options.model.repairPlanStep({
        plan: input.plan,
        step: input.step,
        error: serializeAgentError(input.error),
        outputs: input.outputs,
        schema: input.tool.inputSchema,
      });

      if (!repair?.params || typeof repair.params !== "object" || Array.isArray(repair.params)) {
        throw new AgentRuntimeError(
          "Model returned an invalid repair patch",
          "AGENT_PLAN_REPAIR_INVALID",
          "Agent generated invalid repaired parameters",
          400,
        );
      }

      return { params: repair.params };
    },
  };
}

export function isRepairableAgentPlanError(error: unknown): boolean {
  if (error instanceof AgentToolApprovalRequiredError) return false;
  if (!(error instanceof AgentRuntimeError)) return false;
  if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) return false;

  return [
    "AGENT_TOOL_ARGS_INVALID",
    "AGENT_TOOL_PARAM_MISSING",
    "AGENT_TOOL_REF_UNRESOLVED",
  ].includes(error.code) || error.statusCode === 400;
}
