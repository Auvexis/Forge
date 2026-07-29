import { describe, expect, it } from "vitest";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "../mcp/internal-mcp-server.ts";
import { runMcpAgentLoop } from "./mcp-agent-loop.ts";

describe("runMcpAgentLoop", () => {
  it("executes every required action and passes previous outputs by reference", async () => {
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    const connectedTools = [
      tool("drive_download", async (arguments_) => {
        calls.push({ name: "drive_download", arguments: arguments_ });
        return { ref: "artifact://video-1", name: "X.mp4" };
      }),
      tool("email_send", async (arguments_) => {
        calls.push({ name: "email_send", arguments: arguments_ });
        return { messageId: "mail-1" };
      }),
      tool("youtube_upload", async (arguments_) => {
        calls.push({ name: "youtube_upload", arguments: arguments_ });
        return { videoId: "youtube-1" };
      }),
    ];
    const decisions = [
      { action: "call", arguments: { fileName: "X.mp4" } },
      { action: "call", arguments: { to: "y@example.com", file: "artifact://video-1" } },
      { action: "call", arguments: { video: "artifact://video-1" } },
    ];

    const result = await runMcpAgentLoop({
      model: {
        invokeJson: async () => decisions.shift() as any,
        generateFinalResponse: async () => "Concluído.",
      },
      client: new InternalMcpClient(new InternalMcpServer(connectedTools)),
      systemPrompt: "Be precise.",
      userMessage: "Download X, email it, then upload it.",
      contextMessages: [],
      actions: [
        { id: "download", toolName: "drive_download", objective: "Download X", dependsOn: [] },
        { id: "email", toolName: "email_send", objective: "Email X", dependsOn: ["download"] },
        { id: "youtube", toolName: "youtube_upload", objective: "Upload X", dependsOn: ["download"] },
      ],
      maxToolCalls: 3,
      emitEvent: () => undefined,
    });

    expect(result.status).toBe("success");
    expect(result.toolCallCount).toBe(3);
    expect(calls.map((call) => call.name)).toEqual(["drive_download", "email_send", "youtube_upload"]);
    expect(calls[1]?.arguments.file).toBe("artifact://video-1");
  });

  it("pauses instead of guessing missing context", async () => {
    const result = await runMcpAgentLoop({
      model: {
        invokeJson: async <T extends object>() =>
          ({ action: "clarify", question: "Qual é o email de Y?" }) as T,
        generateFinalResponse: async () => "",
      },
      client: new InternalMcpClient(new InternalMcpServer([tool("email_send", async () => null)])),
      systemPrompt: "",
      userMessage: "Envie para Y",
      contextMessages: [],
      actions: [{ id: "email", toolName: "email_send", objective: "Enviar para Y", dependsOn: [] }],
      maxToolCalls: 1,
      emitEvent: () => undefined,
    });

    expect(result.status).toBe("waiting-user");
    expect(result.output).toMatchObject({ question: "Qual é o email de Y?" });
  });
  it("repairs invalid tool arguments once before execution", async () => {
    const decisions = [
      { action: "call", arguments: { to: "y@example.com", unknown: true } },
      { action: "call", arguments: { to: "y@example.com" } },
    ];
    let executions = 0;
    const result = await runMcpAgentLoop({
      model: {
        invokeJson: async () => decisions.shift() as any,
        generateFinalResponse: async () => "Enviado.",
      },
      client: new InternalMcpClient(new InternalMcpServer([{
        ...tool("email_send", async () => {
          executions += 1;
          return { messageId: "mail_1" };
        }),
        inputSchema: {
          type: "object",
          required: ["to"],
          properties: { to: { type: "string" } },
        },
      }])),
      systemPrompt: "",
      userMessage: "Envie para Y",
      contextMessages: [],
      actions: [{ id: "email", toolName: "email_send", objective: "Enviar", dependsOn: [] }],
      maxToolCalls: 1,
      emitEvent: () => undefined,
    });

    expect(result.status).toBe("success");
    expect(executions).toBe(1);
    expect(decisions).toHaveLength(0);
  });
});

function tool(name: string, invoke: (arguments_: Record<string, unknown>) => Promise<unknown>) {
  return {
    name,
    summary: name,
    sideEffect: "read" as const,
    requiresApproval: false,
    timeoutMs: 30_000,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        fileName: { type: "string" },
        to: { type: "string" },
        file: { type: "string" },
        video: { type: "string" },
      },
    },
    invoke,
  };
}
