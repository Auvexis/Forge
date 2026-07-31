import { describe, expect, it } from "vitest";
import {
  advanceResumableMcpAgentLoop,
  createResumableMcpLoopState,
} from "./resumable-mcp-agent-loop.ts";

describe("progressive tool discovery for small models", () => {
  it("shows compact cards first and loads only the selected schema", async () => {
    const schemas: Record<string, unknown>[] = [];
    const described: string[] = [];
    const tools = Array.from({ length: 32 }, (_, index) => ({
      name: index === 19 ? "google_drive_list_files" : `unrelated_tool_${index}`,
      summary: index === 19 ? "Search files in Google Drive" : `Unrelated operation ${index}`,
      aliases: index === 19 ? ["listfiles", "google drive listfiles"] : [],
      sideEffect: "read" as const,
    }));
    const decisions = [
      { mode: "tool", toolName: "google_drive_list_files", objective: "Find backend CV" },
      { action: "call", arguments: { query: "backend pdf" } },
    ];

    const result = await advanceResumableMcpAgentLoop({
      runId: "run_small",
      model: {
        invokeJson: async (request: { schema: Record<string, unknown> }) => {
          schemas.push(request.schema);
          return decisions.shift() as any;
        },
      },
      client: {
        listTools: () => tools,
        describeTool: (name: string) => {
          described.push(name);
          return {
            name,
            summary: "Search files",
            pluginId: "google-drive",
            methodId: "listFiles",
            sideEffect: "read",
            requiresApproval: false,
            timeoutMs: 30_000,
            inputSchema: {
              type: "object",
              required: ["query"],
              properties: { query: { type: "string" } },
            },
          };
        },
        validateToolArguments: (_name: string, arguments_: Record<string, unknown>) => {
          if (typeof arguments_.query !== "string") throw new Error("query required");
        },
      } as any,
      systemPrompt: "",
      userMessage: "Busque meu currículo de backend no Drive",
      contextMessages: [],
      state: createResumableMcpLoopState(),
      maxIterations: 8,
      maxToolCalls: 4,
    });

    expect(result).toMatchObject({
      type: "request",
      request: {
        toolName: "google_drive_list_files",
        arguments: { query: "backend pdf" },
      },
    });
    expect(described).toEqual(["google_drive_list_files"]);
    expect(JSON.stringify(schemas[0])).not.toContain("\"query\"");
    expect(JSON.stringify(schemas[1])).toContain("\"query\"");
  });

  it("repairs invalid schema-bound arguments exactly once", async () => {
    const decisions = [
      { mode: "tool", toolName: "email_send", objective: "Send email" },
      { action: "call", arguments: {} },
      { action: "call", arguments: { to: "andre@example.com" } },
    ];
    let validations = 0;
    const result = await advanceResumableMcpAgentLoop({
      runId: "run_repair",
      model: { invokeJson: async () => decisions.shift() as any },
      client: {
        listTools: () => [{
          name: "email_send",
          summary: "Send email",
          aliases: ["sendemail"],
          sideEffect: "write",
        }],
        describeTool: () => ({
          name: "email_send",
          summary: "Send email",
          sideEffect: "write",
          requiresApproval: false,
          timeoutMs: 30_000,
          inputSchema: {
            type: "object",
            required: ["to"],
            properties: { to: { type: "string" } },
          },
        }),
        validateToolArguments: (_name: string, arguments_: Record<string, unknown>) => {
          validations += 1;
          if (typeof arguments_.to !== "string") throw new Error("to required");
        },
      } as any,
      systemPrompt: "",
      userMessage: "Envie o arquivo",
      contextMessages: [],
      state: createResumableMcpLoopState(),
      maxIterations: 8,
      maxToolCalls: 4,
    });
    expect(result.type).toBe("request");
    expect(validations).toBe(2);
    expect(decisions).toHaveLength(0);
  });
});
