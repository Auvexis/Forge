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
      toolCalls: [{
        toolCallId: "call_1",
        name: "drive_download",
        status: "success",
      }],
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

  it("executes independent reads concurrently while preserving side-effect order", async () => {
    const order: string[] = [];
    let releaseReads!: () => void;
    const readsReleased = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });
    let startedReads = 0;
    const read = (name: string) => async () => {
      order.push(`${name}:start`);
      startedReads += 1;
      if (startedReads === 2) releaseReads();
      await readsReleased;
      order.push(`${name}:end`);
      return name;
    };
    const client = new InternalMcpClient(new InternalMcpServer([
      {
        name: "read_one",
        summary: "Read one",
        sideEffect: "read",
        requiresApproval: false,
        timeoutMs: 1_000,
        inputSchema: { type: "object", additionalProperties: false },
        invoke: read("read_one"),
      },
      {
        name: "read_two",
        summary: "Read two",
        sideEffect: "read",
        requiresApproval: false,
        timeoutMs: 1_000,
        inputSchema: { type: "object", additionalProperties: false },
        invoke: read("read_two"),
      },
      {
        name: "send",
        summary: "Send",
        sideEffect: "write",
        requiresApproval: false,
        timeoutMs: 1_000,
        inputSchema: { type: "object", additionalProperties: false },
        invoke: async () => {
          order.push("send");
          return "sent";
        },
      },
    ]));
    let turn = 0;
    const model: AgentStreamingModel = {
      async *stream() {
        turn += 1;
        yield { type: "response-start", responseId: `response_${turn}` };
        if (turn === 1) {
          yield { type: "tool-call", callId: "call_1", toolName: "read_one", input: {} };
          yield { type: "tool-call", callId: "call_2", toolName: "read_two", input: {} };
          yield { type: "tool-call", callId: "call_3", toolName: "send", input: {} };
          yield { type: "response-end", responseId: "response_1", finishReason: "tool-calls" };
          return;
        }
        yield { type: "text-start", partId: "text_1" };
        yield { type: "text-delta", partId: "text_1", delta: "Done" };
        yield { type: "text-end", partId: "text_1" };
        yield { type: "response-end", responseId: "response_2", finishReason: "stop" };
      },
    };

    await runAgentProcessor({
      model,
      client,
      systemPrompt: "",
      messages: [{ role: "user", content: "Read and send" }],
      maxIterations: 3,
      maxToolCalls: 4,
      maxConcurrentReads: 2,
    });

    expect(order.slice(0, 2)).toEqual(["read_one:start", "read_two:start"]);
    expect(order.at(-1)).toBe("send");
  });

  it("assigns a stable action identity before side-effect reservation", async () => {
    let reservedActionId: string | undefined;
    const server = new InternalMcpServer(
      [{
        name: "email_send",
        summary: "Send email",
        sideEffect: "external-message",
        requiresApproval: false,
        timeoutMs: 1_000,
        inputSchema: { type: "object", additionalProperties: false },
        invoke: async () => "sent",
      }],
      undefined,
      {
        async execute({ call, invoke }) {
          reservedActionId = call.actionId;
          return invoke();
        },
      },
    );
    let turn = 0;
    const model: AgentStreamingModel = {
      async *stream() {
        turn += 1;
        yield { type: "response-start", responseId: `response_${turn}` };
        if (turn === 1) {
          yield { type: "tool-call", callId: "call_1", toolName: "email_send", input: {} };
          yield { type: "response-end", responseId: "response_1", finishReason: "tool-calls" };
          return;
        }
        yield { type: "text-start", partId: "text_1" };
        yield { type: "text-delta", partId: "text_1", delta: "Sent" };
        yield { type: "text-end", partId: "text_1" };
        yield { type: "response-end", responseId: "response_2", finishReason: "stop" };
      },
    };

    await runAgentProcessor({
      model,
      client: new InternalMcpClient(server),
      systemPrompt: "",
      messages: [{ role: "user", content: "Send" }],
      maxIterations: 3,
      maxToolCalls: 2,
    });

    expect(reservedActionId).toBe("action_call_1");
  });

  it("rejects a final response while a requested outcome lacks tool evidence", async () => {
    const client = new InternalMcpClient(new InternalMcpServer([
      {
        name: "download",
        summary: "Download",
        sideEffect: "read",
        requiresApproval: false,
        timeoutMs: 1_000,
        inputSchema: { type: "object", additionalProperties: false },
        invoke: async () => "downloaded",
      },
      {
        name: "publish",
        summary: "Publish",
        sideEffect: "write",
        requiresApproval: false,
        timeoutMs: 1_000,
        inputSchema: { type: "object", additionalProperties: false },
        invoke: async () => "published",
      },
    ]));
    let turn = 0;
    const model: AgentStreamingModel = {
      async *stream(input) {
        turn += 1;
        yield { type: "response-start", responseId: `response_${turn}` };
        if (turn === 1) {
          yield {
            type: "commitments",
            items: [
              { id: "downloaded", description: "Download the video" },
              { id: "published", description: "Publish the video" },
            ],
          };
          yield {
            type: "tool-call",
            callId: "call_1",
            toolName: "download",
            input: {},
            commitmentIds: ["downloaded"],
          };
          yield { type: "response-end", responseId: "response_1", finishReason: "tool-calls" };
          return;
        }
        if (turn === 2) {
          yield { type: "text-start", partId: "premature" };
          yield { type: "text-delta", partId: "premature", delta: "Tudo pronto." };
          yield { type: "text-end", partId: "premature" };
          yield { type: "response-end", responseId: "response_2", finishReason: "stop" };
          return;
        }
        if (turn === 3) {
          expect(input.messages.at(-1)?.content).toContain("published");
          yield {
            type: "tool-call",
            callId: "call_2",
            toolName: "publish",
            input: {},
            commitmentIds: ["published"],
          };
          yield { type: "response-end", responseId: "response_3", finishReason: "tool-calls" };
          return;
        }
        yield { type: "text-start", partId: "final" };
        yield { type: "text-delta", partId: "final", delta: "Vídeo publicado." };
        yield { type: "text-end", partId: "final" };
        yield { type: "response-end", responseId: "response_4", finishReason: "stop" };
      },
    };

    const result = await runAgentProcessor({
      model,
      client,
      systemPrompt: "",
      messages: [{ role: "user", content: "Baixe e publique o vídeo" }],
      maxIterations: 5,
      maxToolCalls: 4,
    });

    expect(result.output).toBe("Vídeo publicado.");
    expect(result.iterations).toBe(4);
    expect(result.toolCallCount).toBe(2);
  });
});
