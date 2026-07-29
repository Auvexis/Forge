import { describe, expect, it } from "vitest";
import { AgentRuntimeMetrics } from "./agent-runtime-metrics.ts";

describe("AgentRuntimeMetrics", () => {
  it("counts MCP isolation audit outcomes independently", () => {
    const metrics = new AgentRuntimeMetrics();
    metrics.increment("mcp_catalog_snapshot_created");
    metrics.increment("mcp_catalog_snapshot_created");
    metrics.increment("mcp_catalog_isolation_rejected");

    expect(metrics.value("mcp_catalog_snapshot_created")).toBe(2);
    expect(metrics.value("mcp_catalog_snapshot_verified")).toBe(0);
    expect(metrics.value("mcp_catalog_isolation_rejected")).toBe(1);
  });
});
