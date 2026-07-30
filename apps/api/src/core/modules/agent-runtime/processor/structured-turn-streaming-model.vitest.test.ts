import { describe, expect, it, vi } from "vitest";
import { collectAgentResponse } from "./agent-response-stream.ts";
import { StructuredTurnStreamingModel } from "./structured-turn-streaming-model.ts";

describe("StructuredTurnStreamingModel", () => {
  it("normalizes the current structured model API into processor events", async () => {
    const invokeJson = vi.fn();
    const model = new StructuredTurnStreamingModel({
      async invokeJson<T extends object>() {
        invokeJson();
        return {
          type: "tool-calls",
          calls: [{
            id: "call_1",
            name: "drive_download",
            arguments: { file: "X.mp4" },
          }],
        } as T;
      },
    });
    const result = await collectAgentResponse(model.stream({
      messages: [{ role: "user", content: "Baixe X.mp4" }],
      tools: [{
        name: "drive_download",
        description: "Download a file",
        inputSchema: { type: "object" },
      }],
    }));

    expect(result.toolCalls).toEqual([{
      callId: "call_1",
      toolName: "drive_download",
      input: { file: "X.mp4" },
      providerExecuted: false,
      commitmentIds: [],
    }]);
    expect(invokeJson).toHaveBeenCalledOnce();
  });
});
