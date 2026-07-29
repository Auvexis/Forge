import { AgentRuntimeError } from "../agent-errors.ts";
import type { AgentActionState, AgentRunState } from "./agent-domain-contracts.ts";

const RUN_TRANSITIONS: Record<AgentRunState, ReadonlySet<AgentRunState>> = {
  routing: new Set(["running", "waiting-user", "failed", "cancelled"]),
  running: new Set(["waiting-user", "waiting-approval", "completed", "failed", "cancelled"]),
  "waiting-user": new Set(["running", "cancelled"]),
  "waiting-approval": new Set(["running", "cancelled"]),
  completed: new Set(),
  failed: new Set(),
  cancelled: new Set(),
};

const ACTION_TRANSITIONS: Record<AgentActionState, ReadonlySet<AgentActionState>> = {
  pending: new Set(["ready", "skipped"]),
  ready: new Set(["running", "waiting-user", "skipped"]),
  running: new Set(["waiting-user", "waiting-approval", "completed", "failed"]),
  "waiting-user": new Set(["ready", "skipped"]),
  "waiting-approval": new Set(["ready", "skipped"]),
  completed: new Set(),
  failed: new Set(["ready", "skipped"]),
  skipped: new Set(),
};

export function assertAgentRunTransition(from: AgentRunState, to: AgentRunState): void {
  assertTransition("run", from, to, RUN_TRANSITIONS[from]);
}

export function assertAgentActionTransition(from: AgentActionState, to: AgentActionState): void {
  assertTransition("action", from, to, ACTION_TRANSITIONS[from]);
}

function assertTransition(
  entity: "run" | "action",
  from: string,
  to: string,
  allowed: ReadonlySet<string>,
): void {
  if (allowed.has(to)) return;
  throw new AgentRuntimeError(
    `Invalid agent ${entity} transition: ${from} -> ${to}`,
    "AGENT_STATE_TRANSITION_INVALID",
    "Agent state transition is invalid",
    409,
  );
}
