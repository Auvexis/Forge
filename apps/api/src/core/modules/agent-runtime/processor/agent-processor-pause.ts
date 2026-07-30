import type { AgentMcpError, AgentPendingInteractionKind } from "../contracts/agent-domain-contracts.ts";

export class AgentProcessorPause extends Error {
  constructor(
    public readonly kind: Exclude<AgentPendingInteractionKind, "approval">,
    public readonly question: string,
    public readonly toolName: string,
    public readonly error: AgentMcpError,
  ) {
    super(`Agent processor paused for ${kind}: ${question}`);
  }
}

export function pauseKind(error: AgentMcpError): AgentProcessorPause["kind"] {
  if (error.category === "ambiguous") return "selection";
  if (error.category === "authentication") return "authentication";
  if (error.category === "permission") return "permission";
  return "clarification";
}
