import { describe, expect, it } from "vitest";
import {
  compactAgentConversation,
  conversationBudgetChars,
} from "./agent-conversation-compactor.ts";
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";

describe("compactAgentConversation", () => {
  it("keeps recent messages and reports deterministic omission", () => {
    const messages: AgentModelMessage[] = [
      { role: "user", content: "old ".repeat(100) },
      { role: "assistant", content: "old response ".repeat(100) },
      { role: "user", content: "recent question" },
      { role: "assistant", content: "recent answer" },
    ];

    const compacted = compactAgentConversation(messages, 220);

    expect(compacted[0]).toEqual({
      role: "system",
      content: "Earlier conversation messages were omitted to fit the model context.",
    });
    expect(compacted).toContainEqual({ role: "user", content: "recent question" });
    expect(compacted).toContainEqual({ role: "assistant", content: "recent answer" });
    expect(JSON.stringify(compacted).length).toBeLessThanOrEqual(220);
  });

  it("never separates an assistant tool call from its tool result", () => {
    const pair: AgentModelMessage[] = [
      {
        role: "assistant",
        content: "",
        tool_calls: [{ id: "call_1", name: "drive_download", arguments: { file: "X.mp4" } }],
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        name: "drive_download",
        content: JSON.stringify({ artifact: "artifact://video" }),
      },
    ];
    const messages: AgentModelMessage[] = [
      { role: "user", content: "old ".repeat(100) },
      ...pair,
      { role: "assistant", content: "Done." },
    ];

    const compacted = compactAgentConversation(messages, JSON.stringify(pair).length + 160);

    expect(compacted).toEqual(expect.arrayContaining(pair));
    expect(compacted.filter((message) => message.tool_call_id === "call_1")).toHaveLength(1);
  });

  it("drops linked orphan tool results instead of replaying invalid history", () => {
    const compacted = compactAgentConversation([
      { role: "tool", tool_call_id: "missing", content: "orphan" },
      { role: "user", content: "continue" },
    ], 500);

    expect(compacted).toEqual([{ role: "user", content: "continue" }]);
  });

  it("derives a bounded budget from the configured model context", () => {
    expect(conversationBudgetChars(1_024)).toBe(4_000);
    expect(conversationBudgetChars(8_192)).toBe(12_288);
    expect(conversationBudgetChars(100_000)).toBe(32_000);
  });
});
