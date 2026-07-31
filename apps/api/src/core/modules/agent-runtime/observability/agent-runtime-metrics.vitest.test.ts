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

  it("records iteration totals and bounded latency summaries", () => {
    const metrics = new AgentRuntimeMetrics();
    metrics.increment("agent_iterations", 3);
    metrics.observe("agent_tool_latency_ms", 10.4);
    metrics.observe("agent_tool_latency_ms", 20.6);
    metrics.classifyFailure("temporary");
    metrics.classifyFailure("temporary");

    expect(metrics.value("agent_iterations")).toBe(3);
    expect(metrics.timing("agent_tool_latency_ms")).toEqual({
      count: 2,
      total: 31,
      max: 21,
      average: 15.5,
    });
    expect(metrics.failureValue("temporary")).toBe(2);
  });
});
