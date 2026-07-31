import { describe, expect, it } from "vitest";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "../mcp/internal-mcp-server.ts";
import { runIterativeMcpAgentLoop } from "./iterative-mcp-agent-loop.ts";

describe("runIterativeMcpAgentLoop", () => {
  it("discovers and executes list, download, and email one step at a time", async () => {
    const decisions = [
      { mode: "tool", toolName: "drive_list", objective: "Find CV" },
      { action: "call", arguments: { query: "backend" } },
      { mode: "tool", toolName: "drive_download", objective: "Download CV" },
      { action: "call", arguments: { fileId: "file_1" } },
      { mode: "tool", toolName: "email_send", objective: "Send CV" },
      { action: "call", arguments: { to: "andre@example.com", attachment: "artifact://cv" } },
      { mode: "chat", response: "Currículo enviado." },
    ];
    const events: string[] = [];
    const calls: string[] = [];
    const result = await runIterativeMcpAgentLoop({
      model: { invokeJson: async () => decisions.shift() as any },
      client: client([
        tool("drive_list", ["query"], async () => {
          calls.push("drive_list");
          return [{ id: "file_1", name: "backend.pdf" }];
        }),
        tool("drive_download", ["fileId"], async () => {
          calls.push("drive_download");
          return { ref: "artifact://cv" };
        }),
        tool("email_send", ["to", "attachment"], async () => {
          calls.push("email_send");
          return { messageId: "mail_1" };
        }),
      ]),
      systemPrompt: "",
      userMessage: "Busque e envie meu currículo",
      contextMessages: [],
      maxToolCalls: 4,
      emitEvent: (event) => events.push(event.type),
    });

    expect(result).toMatchObject({ status: "success", toolCallCount: 3 });
    expect(calls).toEqual(["drive_list", "drive_download", "email_send"]);
    expect(events.filter((event) => event === "agent:tool-intent")).toHaveLength(3);
    expect(decisions).toHaveLength(0);
  });

  it("keeps a completed step successful when a later step fails", async () => {
    const decisions = [
      { mode: "tool", toolName: "first", objective: "First" },
      { action: "call", arguments: {} },
      { mode: "tool", toolName: "second", objective: "Second" },
      { action: "call", arguments: {} },
    ];
    const terminalStates: string[] = [];

    await expect(runIterativeMcpAgentLoop({
      model: { invokeJson: async () => decisions.shift() as any },
      client: client([
        tool("first", [], async () => ({ ok: true })),
        tool("second", [], async () => {
          throw new Error("second failed");
        }),
      ]),
      systemPrompt: "",
      userMessage: "Execute both",
      contextMessages: [],
      maxToolCalls: 2,
      emitEvent: (event) => {
        if (event.type === "agent:tool-end") terminalStates.push(String(event.payload?.status));
      },
    })).rejects.toThrow();

    expect(terminalStates).toEqual(["success", "failed"]);
  });

  it("rejects an identical completed call without executing or displaying it twice", async () => {
    const decisions = [
      { mode: "tool", toolName: "drive_list", objective: "Find CV" },
      { action: "call", arguments: { query: "backend" } },
      { mode: "tool", toolName: "drive_list", objective: "Find CV again" },
      { action: "call", arguments: { query: "backend" } },
      { mode: "tool", toolName: "drive_download", objective: "Download matching CV" },
      { action: "call", arguments: { fileId: "file_1" } },
      { mode: "chat", response: "Done" },
    ];
    const calls: string[] = [];
    const intents: string[] = [];

    const result = await runIterativeMcpAgentLoop({
      model: { invokeJson: async () => decisions.shift() as any },
      client: client([
        tool("drive_list", ["query"], async () => {
          calls.push("drive_list");
          return [{ id: "file_1", name: "backend.pdf" }];
        }),
        tool("drive_download", ["fileId"], async () => {
          calls.push("drive_download");
          return { ref: "artifact://cv" };
        }),
      ]),
      systemPrompt: "",
      userMessage: "Find and download my backend CV",
      contextMessages: [],
      maxToolCalls: 3,
      emitEvent: (event) => {
        if (event.type === "agent:tool-intent") intents.push(String(event.payload?.name));
      },
    });

    expect(result.status).toBe("success");
    expect(calls).toEqual(["drive_list", "drive_download"]);
    expect(intents).toEqual(["drive_list", "drive_download"]);
  });

  it("uses completed tool calls from prior chat turns to prevent repetition after clarification", async () => {
    const decisions = [
      { mode: "tool", toolName: "drive_list", objective: "Find CV" },
      { action: "call", arguments: { query: "backend" } },
      { mode: "tool", toolName: "drive_download", objective: "Download matching CV" },
      { action: "call", arguments: { fileId: "file_1" } },
      { mode: "chat", response: "Done" },
    ];
    const calls: string[] = [];

    await runIterativeMcpAgentLoop({
      model: { invokeJson: async () => decisions.shift() as any },
      client: client([
        tool("drive_list", ["query"], async () => {
          calls.push("drive_list");
          return [];
        }),
        tool("drive_download", ["fileId"], async () => {
          calls.push("drive_download");
          return { ref: "artifact://cv" };
        }),
      ]),
      systemPrompt: "",
      userMessage: "The PDF contains backend",
      contextMessages: [
        {
          role: "assistant",
          content: "",
          tool_calls: [{
            id: "prior_call",
            name: "drive_list",
            arguments: { query: "backend" },
          }],
        },
        {
          role: "tool",
          name: "drive_list",
          tool_call_id: "prior_call",
          content: JSON.stringify([{ id: "file_1", name: "backend.pdf" }]),
        },
      ],
      maxToolCalls: 3,
      emitEvent: () => {},
    });

    expect(calls).toEqual(["drive_download"]);
  });

  it("explains an empty search result on the first duplicate attempt", async () => {
    const decisions = [
      { mode: "tool", toolName: "drive_list", objective: "Find CV" },
      { action: "call", arguments: { query: "backend" } },
      { mode: "tool", toolName: "drive_list", objective: "Find CV" },
      { action: "call", arguments: { query: "backend" } },
    ];
    let executions = 0;

    const result = await runIterativeMcpAgentLoop({
      model: { invokeJson: async () => decisions.shift() as any },
      client: client([
        tool("drive_list", ["query"], async () => {
          executions += 1;
          return [];
        }),
      ]),
      systemPrompt: "",
      userMessage: "Find my backend CV",
      contextMessages: [],
      maxToolCalls: 4,
      emitEvent: () => {},
    });

    expect(executions).toBe(1);
    expect(result).toMatchObject({
      status: "waiting-user",
      iterationCount: 2,
    });
    expect(JSON.stringify(result.output)).toContain("não encontrou nenhum resultado");
    expect(JSON.stringify(result.output)).not.toContain("qual item desse resultado");
  });
});

function client(tools: ReturnType<typeof tool>[]) {
  return new InternalMcpClient(new InternalMcpServer(tools));
}

function tool(
  name: string,
  required: string[],
  invoke: (arguments_: Record<string, unknown>) => Promise<unknown>,
) {
  return {
    name,
    summary: name,
    sideEffect: "read" as const,
    requiresApproval: false,
    timeoutMs: 5_000,
    inputSchema: {
      type: "object",
      required,
      additionalProperties: false,
      properties: Object.fromEntries(required.map((key) => [key, { type: "string" }])),
    },
    invoke,
  };
}
