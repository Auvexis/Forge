import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import type { AgentPlan, AgentPlanExecutionResult } from "./agent-plan-types.ts";

export interface AgentFinalResponseModel {
  generateFinalResponse(input: {
    messages: AgentModelMessage[];
  }): Promise<string>;
}

export interface GenerateAgentFinalResponseInput {
  model: AgentFinalResponseModel;
  userMessage: string;
  plan: AgentPlan;
  execution: AgentPlanExecutionResult;
}

export async function generateAgentFinalResponse(input: GenerateAgentFinalResponseInput): Promise<string> {
  const response = await input.model.generateFinalResponse({
    messages: [
      {
        role: "system",
        content: [
          "Write a short natural language final response for the user.",
          "Use only the executed plan summary and tool outputs.",
          "If no tool was needed, answer the user's chat message naturally.",
          "Do not expose raw JSON unless the user asked for it.",
          "Keep it concise.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          userRequest: input.userMessage,
          executedPlan: input.plan.steps.map((step) => ({
            id: step.id,
            toolName: step.toolName,
            reason: step.reason,
          })),
          status: input.execution.status,
          toolCalls: input.execution.toolCalls ?? [],
          outputs: summarizeValue(input.execution.outputs ?? input.execution.output),
          result: summarizeValue(input.execution.output),
        }),
      },
    ],
  });

  return response.trim();
}

function summarizeValue(value: unknown): unknown {
  if (typeof value === "string") return truncate(value);
  if (!value || typeof value !== "object") return value;
  if (Buffer.isBuffer(value)) return { type: "buffer", bytes: value.byteLength };
  if (Array.isArray(value)) return value.slice(0, 8).map(summarizeValue);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 24)
      .map(([key, item]) => [key, summarizeValue(item)]),
  );
}

function truncate(value: string): string {
  return value.length > 1200 ? `${value.slice(0, 1200)}[truncated ${value.length - 1200} chars]` : value;
}
