import { describe, expect, it } from "vitest";
import {
  buildCanonicalScratchpad,
  canonicalizeToolHistory,
  reconstructScratchpadSteps,
} from "./canonical-agent-scratchpad.ts";

describe("canonical agent scratchpad", () => {
  it("builds correlated assistant calls and tool results", () => {
    const messages = buildCanonicalScratchpad([{
      toolCallId: "call_1",
      toolName: "drive_download",
      arguments: { fileId: "file_1" },
      output: { ref: "artifact://video_1" },
    }]);
    expect(messages).toEqual([
      {
        role: "assistant",
        content: "",
        tool_calls: [{
          id: "call_1",
          name: "drive_download",
          arguments: { fileId: "file_1" },
        }],
      },
      {
        role: "tool",
        name: "drive_download",
        tool_call_id: "call_1",
        content: "{\"ref\":\"artifact://video_1\"}",
      },
    ]);
  });

  it("removes orphan and duplicate results and reconstructs by call id", () => {
    const canonical = canonicalizeToolHistory([
      { role: "tool", tool_call_id: "orphan", content: "ignored" },
      {
        role: "assistant",
        content: "",
        tool_calls: [{ id: "call_1", name: "search", arguments: { query: "cv" } }],
      },
      { role: "tool", tool_call_id: "call_1", content: "[{\"id\":\"file_1\"}]" },
      { role: "tool", tool_call_id: "call_1", content: "duplicate" },
    ]);
    expect(canonical).toHaveLength(2);
    expect(reconstructScratchpadSteps(canonical)).toEqual([{
      toolCallId: "call_1",
      toolName: "search",
      arguments: { query: "cv" },
      output: [{ id: "file_1" }],
    }]);
  });

  it("bounds large results while retaining artifact references", () => {
    const messages = buildCanonicalScratchpad([{
      toolCallId: "call_1",
      toolName: "download",
      arguments: {},
      output: {
        items: Array.from({ length: 8 }, (_, index) => ({
          index,
          description: `record-${index}-${"x".repeat(100)}`,
        })),
        ref: "artifact://file_1",
      },
    }], 256);
    const result = JSON.parse(messages[1]!.content);
    expect(result).toMatchObject({
      truncated: true,
      artifactRefs: ["artifact://file_1"],
    });
    expect(messages[1]!.content.length).toBeLessThan(500);
  });
});
