import type { AgentEngineRequestStatus } from "./agent-engine-request.ts";

const TRANSITIONS: Record<AgentEngineRequestStatus, ReadonlySet<AgentEngineRequestStatus>> = {
  queued: new Set(["leased", "cancelled"]),
  leased: new Set(["executing", "queued", "cancelled"]),
  executing: new Set(["completed", "failed", "queued", "cancelled"]),
  completed: new Set(),
  failed: new Set(),
  cancelled: new Set(),
};

export function assertAgentEngineRequestTransition(
  from: AgentEngineRequestStatus,
  to: AgentEngineRequestStatus,
): void {
  if (from === to || TRANSITIONS[from].has(to)) return;
  throw new Error(`Invalid agent engine request transition: ${from} -> ${to}`);
}
