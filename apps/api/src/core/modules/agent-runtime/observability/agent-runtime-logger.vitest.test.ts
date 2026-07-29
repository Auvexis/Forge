import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRuntimeLogger } from "./agent-runtime-logger.ts";

describe("AgentRuntimeLogger", () => {
  afterEach(() => {
    delete process.env.FABRIC_AGENT_LOG_LEVEL;
    vi.restoreAllMocks();
  });

  it("redacts secrets and preserves correlation fields", () => {
    const write = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const logger = new AgentRuntimeLogger({
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      runId: "run_1",
    });

    logger.info("run.started", { apiKey: "secret", mode: "action" });

    const line = String(write.mock.calls[0]?.[0]);
    expect(line).toContain("[FABRIC | AGENT]");
    expect(line).toContain('"runId":"run_1"');
    expect(line).toContain('"apiKey":"[REDACTED]"');
    expect(line).not.toContain('"secret"');
  });

  it("honors the configured minimum log level", () => {
    process.env.FABRIC_AGENT_LOG_LEVEL = "warn";
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logger = new AgentRuntimeLogger({
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
    });

    logger.debug("action.preparing");
    logger.warn("action.waiting_user");

    expect(debug).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });
});
