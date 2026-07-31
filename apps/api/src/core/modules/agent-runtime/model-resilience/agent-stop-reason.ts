import { AgentRuntimeError } from "../agent-errors.ts";
import type { AgentRunResult } from "../agent-types.ts";

export type AgentStopReason = NonNullable<AgentRunResult["stopReason"]>;

export function stopReasonForError(error: unknown): AgentStopReason {
  if (error instanceof AgentRuntimeError) {
    if (error.code === "AGENT_TOOL_LIMIT_EXCEEDED") return "tool-call-limit";
    if (error.code === "AGENT_ITERATION_LIMIT_EXCEEDED") return "iteration-limit";
    if (error.code.startsWith("AGENT_MODEL_")) return "model-error";
    if (/CANCEL/.test(error.code)) return "cancelled";
  }
  return "tool-error";
}
