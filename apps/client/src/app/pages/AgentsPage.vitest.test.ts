import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AgentsPage", () => {
  it("hosts the new snapshot-based chat modal", () => {
    const source = readFileSync(new URL("./AgentsPage.vue", import.meta.url), "utf8");
    const router = readFileSync(new URL("../router.ts", import.meta.url), "utf8");

    expect(source).toMatch(/AgentChatModal/);
    expect(source).toMatch(/chatOpen = ref\(true\)/);
    expect(router).toMatch(/pages\/AgentsPage\.vue/);
    expect(router).not.toMatch(/AgentPanelPage/);
  });
});
