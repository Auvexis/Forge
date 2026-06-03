import { AgentRuntimeError } from "../agent-errors.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import type { AgentPlan, AgentPlanStep, AgentPlanTool } from "./agent-plan-types.ts";

export interface AgentPlanModel {
  generatePlan(input: {
    messages: AgentModelMessage[];
    schema: Record<string, any>;
  }): Promise<AgentPlan>;
}

export interface GenerateAgentPlanInput {
  model: AgentPlanModel;
  userMessage: string;
  tools: AgentPlanTool[];
  saveMessage?: (message: string) => void | Promise<void>;
}

export async function generateAgentPlan(input: GenerateAgentPlanInput): Promise<AgentPlan> {
  await saveProgress(input, "Thinking");
  await saveProgress(input, "Generating Plan");
  await saveProgress(input, "Choosing the best tools");

  const plan = await input.model.generatePlan({
    messages: [
      { role: "system", content: buildPlanPrompt(input.tools) },
      { role: "user", content: input.userMessage },
    ],
    schema: agentPlanJsonSchema(),
  });

  return validateGeneratedPlan(plan, input.tools);
}

function buildPlanPrompt(tools: AgentPlanTool[]): string {
  const catalog = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: compactSchema(tool.inputSchema),
  }));

  return [
    "Generate one complete deterministic tool execution plan.",
    "Return JSON only with steps[].id, steps[].toolName, steps[].params, steps[].reason.",
    "Use only tools from this compact catalog.",
    "Use refs for previous outputs when needed:",
    "- $steps.<stepId>",
    "- $steps.<stepId>.<field>",
    "- $steps.<stepId>[0].<field>",
    JSON.stringify({ tools: catalog }),
  ].join("\n");
}

function compactSchema(schema: Record<string, any>): Record<string, any> {
  return {
    type: schema.type,
    properties: schema.properties,
    required: schema.required,
  };
}

function validateGeneratedPlan(plan: AgentPlan, tools: AgentPlanTool[]): AgentPlan {
  if (!plan || typeof plan !== "object" || !Array.isArray(plan.steps)) {
    throw new AgentRuntimeError(
      "Model returned an invalid agent plan",
      "AGENT_PLAN_INVALID",
      "Agent generated an invalid plan",
      400,
    );
  }

  if (plan.steps.length === 0 && tools.length > 0) {
    throw new AgentRuntimeError(
      "Model returned an empty agent plan",
      "AGENT_PLAN_EMPTY",
      "Agent could not choose tools for this request",
      400,
    );
  }

  const availableToolNames = new Set(tools.map((tool) => tool.name));
  const stepIds = new Set<string>();
  for (const step of plan.steps) {
    validatePlanStep(step, availableToolNames, stepIds);
    stepIds.add(step.id);
  }

  return plan;
}

function validatePlanStep(
  step: AgentPlanStep,
  availableToolNames: Set<string>,
  stepIds: Set<string>,
): void {
  if (!step || typeof step !== "object") {
    throwPlanInvalid("Agent plan step is invalid");
  }
  if (!step.id?.trim() || stepIds.has(step.id)) {
    throwPlanInvalid("Agent plan step id is missing or duplicated");
  }
  if (!availableToolNames.has(step.toolName)) {
    throw new AgentRuntimeError(
      `Unknown agent plan tool: ${step.toolName}`,
      "AGENT_PLAN_TOOL_UNKNOWN",
      "Agent requested an unavailable tool",
      400,
    );
  }
  if (!step.params || typeof step.params !== "object" || Array.isArray(step.params)) {
    throwPlanInvalid("Agent plan step params must be an object");
  }
  if (typeof step.reason !== "string" || !step.reason.trim()) {
    throwPlanInvalid("Agent plan step reason is required");
  }
}

function throwPlanInvalid(message: string): never {
  throw new AgentRuntimeError(
    message,
    "AGENT_PLAN_INVALID",
    "Agent generated an invalid plan",
    400,
  );
}

function agentPlanJsonSchema(): Record<string, any> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["steps"],
    properties: {
      steps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "toolName", "params", "reason"],
          properties: {
            id: { type: "string" },
            toolName: { type: "string" },
            params: { type: "object" },
            reason: { type: "string" },
          },
        },
      },
    },
  };
}

async function saveProgress(input: GenerateAgentPlanInput, message: string): Promise<void> {
  await input.saveMessage?.(message);
}
