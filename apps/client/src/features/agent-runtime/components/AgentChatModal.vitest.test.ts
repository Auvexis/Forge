import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AgentChatModal", () => {
  it("uses BaseModal and canonical session snapshots without realtime state", () => {
    const source = readFileSync(
      new URL("./AgentChatModal.vue", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/BaseModal/);
    expect(source).toMatch(/AgentSessionPanel/);
    expect(source).toMatch(/agentChatApi\.listChats/);
    expect(source).toMatch(/agentChatApi\.sendMessage/);
    expect(source).toMatch(/agentChatApi\.createSession/);
    expect(source).toMatch(/sessionPanel\.value\?\.invalidate/);
    expect(source).toMatch(/filteredChats/);
    expect(source).toMatch(/agent-chat-modal__composer-box/);
    expect(source).not.toMatch(/EventSource|WebSocket|agent:tool-start|agent:output-delta/);
  });
});
