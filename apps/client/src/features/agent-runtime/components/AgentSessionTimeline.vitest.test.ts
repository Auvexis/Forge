import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AgentSessionTimeline", () => {
  it("renders canonical text, tool, interaction, and commitment parts", () => {
    const source = readFileSync(
      new URL("./AgentSessionTimeline.vue", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/part\.type === 'text'/);
    expect(source).toMatch(/part\.type === 'tool'/);
    expect(source).toMatch(/part\.type === 'interaction'/);
    expect(source).toMatch(/part\.type === 'commitment'/);
    expect(source).toMatch(/part\.state\.status/);
    expect(source).toMatch(/snapshot\.revision/);
    expect(source).toMatch(/part\.type === 'tool' && showSteps/);
    expect(source).toMatch(/showSteps: true/);
  });
});
