export type ExecutionStatus = "idle" | "running" | "success" | "failed";

/**
 * STATUS_RING — CSS class map keyed by execution state.
 * Applied to the outer Card to visualise the node's live status.
 */
export const STATUS_RING: Record<ExecutionStatus, string> = {
  idle: "",
  running:
    "ring-2 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] scale-[1.02]",
  success:
    "ring-2 ring-emerald-500/60 shadow-[0_0_12px_2px_rgba(16,185,129,0.2)]",
  failed:
    "ring-2 ring-red-500/60 shadow-[0_0_12px_2px_rgba(239,68,68,0.2)]",
};
