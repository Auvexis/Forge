import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sanitizeAgentToolValue,
  serializeAgentLoopHistory,
} from "./agent-tool-result-sanitizer.ts";

describe("agent tool result sanitizer", () => {
  it("hides buffers, blobs, and large base64-like strings before model prompts", () => {
    const blob = new Blob(["hello"]);
    const sanitized = sanitizeAgentToolValue({
      file: Buffer.from("secret file"),
      blob,
      inlineData: "a".repeat(1800),
      nested: {
        ok: "visible",
        payload: "data:application/pdf;base64," + "b".repeat(1400),
      },
    });

    assert.deepEqual(sanitized, {
      file: { type: "buffer", bytes: 11 },
      blob: { type: "blob", bytes: 5 },
      inlineData: { type: "base64", chars: 1800 },
      nested: {
        ok: "visible",
        payload: { type: "base64", chars: 1428 },
      },
    });
  });

  it("serializes loop history as compact lines without raw binary data", () => {
    const history = serializeAgentLoopHistory([
      {
        type: "tool_result",
        toolName: "download",
        result: {
          id: "file_1",
          data: Buffer.from("pdf"),
          content: "x".repeat(2000),
        },
      },
      {
        type: "tool_error",
        toolName: "send",
        error: "Missing to",
      },
    ]);

    assert.match(history, /^TOOL download RESULT /);
    assert.match(history, /TOOL send ERROR Missing to/);
    assert.match(history, /"type":"buffer"/);
    assert.doesNotMatch(history, /x{100}/);
  });
});
