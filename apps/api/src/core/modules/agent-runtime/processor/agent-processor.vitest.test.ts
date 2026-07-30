import { describe, expect, it, vi } from "vitest";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "../mcp/internal-mcp-server.ts";
import type { AgentStreamingModel } from "./agent-response-stream.ts";
import { runAgentProcessor } from "./agent-processor.ts";

describe("runAgentProcessor", () => {
  it("uses one loop for tool decisions and the final conversational response", async () => {
    const invoke = vi.fn(async () => ({ id: "video" }));
    const client = new InternalMcpClient(new InternalMcpServer([{
      name: "drive_download",
      summary: "Download a Drive file",
      sideEffect: "read",
      requiresApproval: false,
      timeoutMs: 1_000,
      inputSchema: {
        type: "object",
        required: ["file"],
        additionalProperties: false,
        properties: { file: { type: "string" } },
      },
      invoke,
    }]));
    let turn = 0;
    const model: AgentStreamingModel = {
      async *stream(input) {
        turn += 1;
        yield { type: "response-start", responseId: `response_${turn}` };
        if (turn === 1) {
          expect(input.tools[0]?.inputSchema).toBeDefined();
          yield {
            type: "tool-call",
            callId: "call_1",
            toolName: "drive_download",
            input: { file: "X.mp4" },
          };
          yield {
            type: "response-end",
            responseId: "response_1",
            finishReason: "tool-calls",
          };
          return;
        }
        expect(input.messages.at(-1)).toMatchObject({
          role: "tool",
          toolCallId: "call_1",
        });
        yield { type: "text-start", partId: "text_1" };
        yield { type: "text-delta", partId: "text_1", delta: "Arquivo baixado." };
        yield { type: "text-end", partId: "text_1" };
        yield {
          type: "response-end",
          responseId: "response_2",
          finishReason: "stop",
        };
      },
    };

    const result = await runAgentProcessor({
      model,
      client,
      systemPrompt: "You are an agent.",
      messages: [{ role: "user", content: "Baixe X.mp4" }],
      maxIterations: 4,
      maxToolCalls: 4,
    });

    expect(result).toEqual({
      status: "completed",
      output: "Arquivo baixado.",
      iterations: 2,
      toolCallCount: 1,
    });
    expect(invoke).toHaveBeenCalledWith({ file: "X.mp4" });
  });

  it("answers ordinary conversation without intent classification", async () => {
    const client = new InternalMcpClient(new InternalMcpServer([]));
    const model: AgentStreamingModel = {
      async *stream() {
        yield { type: "response-start", responseId: "response_1" };
        yield { type: "text-start", partId: "text_1" };
        yield { type: "text-delta", partId: "text_1", delta: "Olá!" };
        yield { type: "text-end", partId: "text_1" };
        yield { type: "response-end", responseId: "response_1", finishReason: "stop" };
      },
    };

    const result = await runAgentProcessor({
      model,
      client,
      systemPrompt: "",
      messages: [{ role: "user", content: "Olá" }],
      maxIterations: 2,
      maxToolCalls: 2,
    });

    expect(result.output).toBe("Olá!");
    expect(result.toolCallCount).toBe(0);
  });
});
