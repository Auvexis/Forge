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
    expect(source).toMatch(/defineExpose\(\{ refresh, invalidate \}\)/);
    expect(source).toMatch(/sessionId: props\.sessionId/);
  });
});
