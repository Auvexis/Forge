import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AgentSessionPanel", () => {
  it("composes the canonical snapshot timeline and durable controls", () => {
    const source = readFileSync(
      new URL("./AgentSessionPanel.vue", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/useAgentSessionSnapshot/);
    expect(source).toMatch(/AgentSessionTimeline/);
    expect(source).toMatch(/AgentSessionControls/);
    expect(source).toMatch(/defineExpose\(\{[\s\S]*refresh,[\s\S]*invalidate,[\s\S]*startLiveMessage,[\s\S]*finishLiveMessage/);
    expect(source).toMatch(/visibleOptimisticMessages/);
    expect(source).toMatch(/sessionId: props\.sessionId/);
    expect(source).toMatch(/:show-steps="showSteps"/);
    expect(source).toMatch(/showSteps = !showSteps/);
  });
});
