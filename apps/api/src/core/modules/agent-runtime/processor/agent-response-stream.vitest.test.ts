import { describe, expect, it } from "vitest";
import {
  collectAgentResponse,
  type AgentResponseStreamEvent,
} from "./agent-response-stream.ts";

async function* stream(events: AgentResponseStreamEvent[]) {
  yield* events;
}

describe("agent response stream", () => {
  it("collects text and multiple tool calls without provider-specific shapes", async () => {
    const response = await collectAgentResponse(stream([
      { type: "response-start", responseId: "response_1" },
      { type: "text-start", partId: "text_1" },
      { type: "text-delta", partId: "text_1", delta: "Vou " },
      { type: "text-delta", partId: "text_1", delta: "executar." },
      { type: "text-end", partId: "text_1" },
      {
        type: "tool-call",
        callId: "call_1",
        toolName: "drive_download",
        input: { file: "X.mp4" },
      },
      {
        type: "tool-call",
        callId: "call_2",
        toolName: "contact_lookup",
        input: { person: "Y" },
      },
      {
        type: "response-end",
        responseId: "response_1",
        finishReason: "tool-calls",
        usage: { inputTokens: 100, outputTokens: 20 },
      },
    ]));

    expect(response.text).toBe("Vou executar.");
    expect(response.toolCalls).toHaveLength(2);
    expect(response.finishReason).toBe("tool-calls");
  });

  it("rejects incomplete streams instead of persisting ambiguous state", async () => {
    await expect(collectAgentResponse(stream([
      { type: "response-start", responseId: "response_1" },
      { type: "text-start", partId: "text_1" },
      { type: "text-delta", partId: "text_1", delta: "partial" },
    ]))).rejects.toThrow(/ended incompletely/);
  });

  it("rejects duplicate tool call identities", async () => {
    await expect(collectAgentResponse(stream([
      { type: "response-start", responseId: "response_1" },
      { type: "tool-call", callId: "call_1", toolName: "one", input: {} },
      { type: "tool-call", callId: "call_1", toolName: "two", input: {} },
      { type: "response-end", responseId: "response_1", finishReason: "tool-calls" },
    ]))).rejects.toThrow(/Duplicate tool call/);
  });
});
