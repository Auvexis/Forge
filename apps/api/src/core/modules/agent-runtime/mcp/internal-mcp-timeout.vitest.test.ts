import { describe, expect, it, vi } from "vitest";
import { InternalMcpClient } from "./internal-mcp-client.ts";
import { InternalMcpServer } from "./internal-mcp-server.ts";
import { runMcpAgentLoop } from "../loop/mcp-agent-loop.ts";

describe("internal MCP execution control", () => {
  it("times out callable tools at the server boundary", async () => {
    const client = new InternalMcpClient(new InternalMcpServer([{
      name: "slow_tool",
      summary: "Slow",
      sideEffect: "read",
      requiresApproval: false,
      timeoutMs: 5,
      inputSchema: { type: "object", properties: {} },
      invoke: async () => await new Promise(() => undefined),
    }]));

    await expect(client.callTool({
      id: "call_1",
      name: "slow_tool",
      arguments: {},
    })).rejects.toMatchObject({ code: "AGENT_TOOL_TIMEOUT" });
  });

  it("checks cancellation before starting the loop", async () => {
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    const invokeJson = vi.fn();

    await expect(runMcpAgentLoop({
      model: {
        invokeJson,
        generateFinalResponse: async () => "",
      },
      client: new InternalMcpClient(new InternalMcpServer([])),
      systemPrompt: "",
      userMessage: "Execute",
      contextMessages: [],
      actions: [],
      maxToolCalls: 1,
      abortSignal: controller.signal,
      emitEvent: () => undefined,
    })).rejects.toThrow("cancelled");
    expect(invokeJson).not.toHaveBeenCalled();
  });
});
