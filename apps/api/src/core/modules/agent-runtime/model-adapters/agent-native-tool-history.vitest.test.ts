import { describe, expect, it } from "vitest";
import { toOpenAiInputItems } from "./openai-adapter.ts";
import { toOllamaMessage } from "./ollama-adapter.ts";
import type { AgentModelMessage } from "./agent-model-adapter.ts";

const assistantCall: AgentModelMessage = {
  role: "assistant",
  content: "",
  tool_calls: [{
    id: "call_123",
    name: "drive_download",
    arguments: { file: "X.mp4" },
  }],
};
const toolResult: AgentModelMessage = {
  role: "tool",
  content: "{\"artifact\":\"artifact://video\"}",
  name: "drive_download",
  tool_call_id: "call_123",
};

describe("native provider tool history", () => {
  it("serializes canonical history as OpenAI Responses function items", () => {
    expect(toOpenAiInputItems(assistantCall)).toEqual([{
      type: "function_call",
      call_id: "call_123",
      name: "drive_download",
      arguments: "{\"file\":\"X.mp4\"}",
    }]);
    expect(toOpenAiInputItems(toolResult)).toEqual([{
      type: "function_call_output",
      call_id: "call_123",
      output: "{\"artifact\":\"artifact://video\"}",
    }]);
  });

  it("serializes canonical history using Ollama native tool messages", () => {
    expect(toOllamaMessage(assistantCall)).toEqual({
      role: "assistant",
      content: "",
      tool_calls: [{
        function: {
          name: "drive_download",
          arguments: { file: "X.mp4" },
        },
      }],
    });
    expect(toOllamaMessage(toolResult)).toEqual({
      role: "tool",
      content: "{\"artifact\":\"artifact://video\"}",
      tool_name: "drive_download",
    });
  });

  it("retains a readable fallback for unlinked legacy tool messages", () => {
    expect(toOpenAiInputItems({
      role: "tool",
      name: "legacy_tool",
      content: "legacy result",
    })).toEqual([{
      role: "user",
      content: "Tool result from legacy_tool:\nlegacy result",
    }]);
  });
});
