import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("desktop agent runtime boundary", () => {
  it("keeps durable agent execution in the API instead of desktop process memory", () => {
    const main = readFileSync(resolve("src/main.ts"), "utf8");
    const preload = readFileSync(resolve("src/preload.ts"), "utf8");
    const desktopRuntime = `${main}\n${preload}`;

    assert.doesNotMatch(desktopRuntime, /agent[_-]sessions/i);
    assert.doesNotMatch(desktopRuntime, /AgentRunner|InternalMcpServer|pendingInteraction/);
    assert.match(main, /loadURL\(desktopUrl\)/);
  });
});
