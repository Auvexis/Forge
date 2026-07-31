export type AgentRuntimeMetric =
  | "mcp_catalog_snapshot_created"
  | "mcp_catalog_snapshot_verified"
  | "mcp_catalog_isolation_rejected"
  | "agent_iterations"
  | "agent_tool_calls"
  | "agent_tool_failures"
  | "agent_run_failures";

export type AgentRuntimeTiming = "agent_tool_latency_ms" | "agent_run_latency_ms";

export class AgentRuntimeMetrics {
  private readonly counters = new Map<AgentRuntimeMetric, number>();
  private readonly timings = new Map<AgentRuntimeTiming, { count: number; total: number; max: number }>();
  private readonly failures = new Map<string, number>();

  increment(metric: AgentRuntimeMetric, amount = 1): void {
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + amount);
  }

  value(metric: AgentRuntimeMetric): number {
    return this.counters.get(metric) ?? 0;
  }

  observe(metric: AgentRuntimeTiming, durationMs: number): void {
    const value = Math.max(0, Math.round(durationMs));
    const current = this.timings.get(metric) ?? { count: 0, total: 0, max: 0 };
    this.timings.set(metric, {
      count: current.count + 1,
      total: current.total + value,
      max: Math.max(current.max, value),
    });
  }

  timing(metric: AgentRuntimeTiming): { count: number; total: number; max: number; average: number } {
    const value = this.timings.get(metric) ?? { count: 0, total: 0, max: 0 };
    return { ...value, average: value.count ? value.total / value.count : 0 };
  }

  classifyFailure(classification: string): void {
    this.failures.set(classification, (this.failures.get(classification) ?? 0) + 1);
  }

  failureValue(classification: string): number {
    return this.failures.get(classification) ?? 0;
  }
}

export const agentRuntimeMetrics = new AgentRuntimeMetrics();
