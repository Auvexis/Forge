import { describe, expect, it } from "vitest";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "../mcp/internal-mcp-server.ts";
import { runMcpAgentLoop } from "./mcp-agent-loop.ts";
import { AgentRuntimeError } from "../agent-errors.ts";

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

  it("explains required fields when the model gives a generic clarification", async () => {
    const result = await runMcpAgentLoop({
      model: {
        invokeJson: async <T extends object>() =>
          ({ action: "clarify", question: "Preciso de mais informações." }) as T,
        generateFinalResponse: async () => "",
      },
      client: new InternalMcpClient(new InternalMcpServer([{
        ...tool("email_send", async () => null),
        inputSchema: {
          type: "object",
          required: ["to", "subject", "body"],
          properties: {
            to: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
          },
        },
      }])),
      systemPrompt: "",
      userMessage: "Envie o currículo",
      contextMessages: [],
      actions: [{ id: "email", toolName: "email_send", objective: "enviar o currículo", dependsOn: [] }],
      maxToolCalls: 1,
      emitEvent: () => undefined,
    });

    expect(result.output).toMatchObject({
      question: expect.stringContaining("to, subject, body"),
    });
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

  it("retries a temporary MCP error with a bounded policy", async () => {
    let executions = 0;
    const result = await runMcpAgentLoop({
      model: {
        invokeJson: async <T extends object>() => ({ action: "call", arguments: {} }) as T,
        generateFinalResponse: async () => "Concluído.",
      },
      client: new InternalMcpClient(new InternalMcpServer([
        tool("temporary_tool", async () => {
          executions += 1;
          if (executions === 1) {
            throw new AgentRuntimeError(
              "provider unavailable",
              "PROVIDER_UNAVAILABLE",
              "Provider temporarily unavailable",
              503,
            );
          }
          return { ok: true };
        }),
      ])),
      systemPrompt: "",
      userMessage: "Execute",
      contextMessages: [],
      actions: [{ id: "temporary", toolName: "temporary_tool", objective: "Execute", dependsOn: [] }],
      maxToolCalls: 1,
      maxRetriesPerTool: 1,
      emitEvent: () => undefined,
    });

    expect(result.status).toBe("success");
    expect(executions).toBe(2);
  });

  it.each([
    ["AUTH_EXPIRED", 401, "authentication"],
    ["PERMISSION_DENIED", 403, "permission"],
    ["FILE_NOT_FOUND", 404, "not-found"],
    ["MULTIPLE_MATCHES", 409, "ambiguous"],
  ] as const)("pauses on %s MCP errors", async (code, statusCode, _category) => {
    const result = await runMcpAgentLoop({
      model: {
        invokeJson: async <T extends object>() => ({ action: "call", arguments: {} }) as T,
        generateFinalResponse: async () => "",
      },
      client: new InternalMcpClient(new InternalMcpServer([
        tool("blocked_tool", async () => {
          throw new AgentRuntimeError("private detail", code, "User action is required", statusCode);
        }),
      ])),
      systemPrompt: "",
      userMessage: "Execute",
      contextMessages: [],
      actions: [{ id: "blocked", toolName: "blocked_tool", objective: "Execute", dependsOn: [] }],
      maxToolCalls: 1,
      maxRetriesPerTool: 2,
      emitEvent: () => undefined,
    });

    expect(result).toMatchObject({
      status: "waiting-user",
      output: { question: "User action is required" },
      toolCallCount: 0,
    });
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
