import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AgentSessionControls", () => {
  it("exposes interaction, approval, retry, and cancel actions", () => {
    const source = readFileSync(
      new URL("./AgentSessionControls.vue", import.meta.url),
      "utf8",
    );

    for (const action of ["respond", "approve", "reject", "retry", "cancel"]) {
      expect(source).toContain(action);
    }
    expect(source).toMatch(/snapshot\.pendingInteraction/);
    expect(source).toMatch(/activeTurn\?\.state === 'failed'/);
  });
});
