import { describe, expect, it, vi } from "vitest";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "../mcp/internal-mcp-server.ts";
import { runAgentProcessor } from "./agent-processor.ts";
import type { AgentStreamingModel } from "./agent-response-stream.ts";

describe("small-model multi-tool reliability", () => {
  it("finishes download, email, and publish even when the model attempts premature answers", async () => {
    const executed: string[] = [];
    const client = new InternalMcpClient(new InternalMcpServer([
      tool("drive_download", "read", executed, { artifact: "artifact://video-x" }),
      tool("email_send", "external-message", executed, { messageId: "email-1" }),
      tool("youtube_publish", "write", executed, { videoId: "youtube-1" }),
    ]));
    let iteration = 0;
    const model: AgentStreamingModel = {
      async *stream(input) {
        iteration += 1;
        const responseId = `small_model_${iteration}`;
        yield { type: "response-start", responseId };
        if (iteration === 1) {
          yield {
            type: "commitments",
            items: [
              { id: "download", description: "Download X.mp4 from Drive" },
              { id: "email", description: "Email X.mp4 to Y" },
              { id: "publish", description: "Publish X.mp4 on YouTube" },
            ],
          };
          yield {
            type: "tool-call",
            callId: "call_download",
            toolName: "drive_download",
            input: { file: "X.mp4" },
            commitmentIds: ["download"],
          };
          yield { type: "response-end", responseId, finishReason: "tool-calls" };
          return;
        }
        if (iteration === 2 || iteration === 4) {
          yield { type: "text-start", partId: `premature_${iteration}` };
          yield { type: "text-delta", partId: `premature_${iteration}`, delta: "Pronto." };
          yield { type: "text-end", partId: `premature_${iteration}` };
          yield { type: "response-end", responseId, finishReason: "stop" };
          return;
        }
        if (iteration === 3) {
          expect(input.messages.some((message) =>
            message.role === "tool" && message.toolCallId === "call_download"
          )).toBe(true);
          yield {
            type: "tool-call",
            callId: "call_email",
            toolName: "email_send",
            input: { artifact: "artifact://video-x", recipient: "Y" },
            commitmentIds: ["email"],
          };
          yield { type: "response-end", responseId, finishReason: "tool-calls" };
          return;
        }
        if (iteration === 5) {
          yield {
            type: "tool-call",
            callId: "call_publish",
            toolName: "youtube_publish",
            input: { artifact: "artifact://video-x" },
            commitmentIds: ["publish"],
          };
          yield { type: "response-end", responseId, finishReason: "tool-calls" };
          return;
        }
        yield { type: "text-start", partId: "final" };
        yield {
          type: "text-delta",
          partId: "final",
          delta: "Arquivo baixado, enviado por email e publicado.",
        };
        yield { type: "text-end", partId: "final" };
        yield { type: "response-end", responseId, finishReason: "stop" };
      },
    };

    const result = await runAgentProcessor({
      model,
      client,
      systemPrompt: "Complete every commitment.",
      messages: [{
        role: "user",
        content: "Baixe X.mp4, envie por email para Y e publique no YouTube.",
      }],
      maxIterations: 8,
      maxToolCalls: 5,
    });

    expect(executed).toEqual(["drive_download", "email_send", "youtube_publish"]);
    expect(result.toolCallCount).toBe(3);
    expect(result.output).toContain("publicado");
    expect(result.iterations).toBe(6);
  });
});

function tool(
  name: string,
  sideEffect: "read" | "write" | "external-message",
  executed: string[],
  output: unknown,
) {
  return {
    name,
    summary: name,
    sideEffect,
    requiresApproval: false,
    timeoutMs: 1_000,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        file: { type: "string" },
        artifact: { type: "string" },
        recipient: { type: "string" },
      },
    },
    invoke: vi.fn(async () => {
      executed.push(name);
      return output;
    }),
  };
}
