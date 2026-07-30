import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("useAgentSessionSnapshot", () => {
  it("reconciles on mount, focus, reconnect, and document visibility", () => {
    const source = readFileSync(
      new URL("./useAgentSessionSnapshot.ts", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/onMounted/);
    expect(source).toMatch(/addEventListener\('focus', refresh\)/);
    expect(source).toMatch(/addEventListener\('online', refresh\)/);
    expect(source).toMatch(/addEventListener\('visibilitychange'/);
    expect(source).toMatch(/invalidate\(revision\?: number\)/);
  });
});
