export type AgentRuntimeMetric =
  | "mcp_catalog_snapshot_created"
  | "mcp_catalog_snapshot_verified"
  | "mcp_catalog_isolation_rejected";

export class AgentRuntimeMetrics {
  private readonly counters = new Map<AgentRuntimeMetric, number>();

  increment(metric: AgentRuntimeMetric): void {
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + 1);
  }

  value(metric: AgentRuntimeMetric): number {
    return this.counters.get(metric) ?? 0;
  }
}

export const agentRuntimeMetrics = new AgentRuntimeMetrics();
