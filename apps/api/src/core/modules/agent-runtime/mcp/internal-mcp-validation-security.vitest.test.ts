import { describe, expect, it, vi } from "vitest";
import { InternalMcpClient } from "./internal-mcp-client.ts";
import { InternalMcpServer } from "./internal-mcp-server.ts";

describe("internal MCP validation security", () => {
  it("rejects prototype-pollution arguments without invoking the tool", async () => {
    const invoke = vi.fn(async () => ({ ok: true }));
    const client = createClient(invoke);
    const arguments_ = JSON.parse(
      '{"to":"user@example.com","__proto__":{"polluted":true}}',
    ) as Record<string, unknown>;

    await expect(client.callTool({
      id: "call_1",
      name: "email_send",
      arguments: arguments_,
    })).rejects.toMatchObject({ code: "AGENT_TOOL_ARGUMENTS_INVALID" });
    expect(invoke).not.toHaveBeenCalled();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("rejects deeply nested and excessively wide argument payloads", async () => {
    const invoke = vi.fn(async () => ({ ok: true }));
    const client = createClient(invoke);
    let deep: Record<string, unknown> = {};
    for (let index = 0; index < 10; index += 1) deep = { nested: deep };

    await expect(client.callTool({
      id: "call_deep",
      name: "email_send",
      arguments: deep,
    })).rejects.toMatchObject({ code: "AGENT_TOOL_ARGUMENTS_INVALID" });
    await expect(client.callTool({
      id: "call_wide",
      name: "email_send",
      arguments: Object.fromEntries(
        Array.from({ length: 301 }, (_, index) => [`key_${index}`, index]),
      ),
    })).rejects.toMatchObject({ code: "AGENT_TOOL_ARGUMENTS_INVALID" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("rejects oversized binary tool results at the Host boundary", async () => {
    const client = createClient(async () => Buffer.alloc(600_000));

    await expect(client.callTool({
      id: "call_binary",
      name: "email_send",
      arguments: { to: "user@example.com" },
    })).rejects.toMatchObject({ code: "AGENT_TOOL_RESULT_INVALID", statusCode: 502 });
  });
});

function createClient(invoke: (args: Record<string, unknown>) => Promise<unknown>) {
  return new InternalMcpClient(new InternalMcpServer([{
    name: "email_send",
    summary: "Send email",
    sideEffect: "external-message",
    requiresApproval: false,
    timeoutMs: 30_000,
    inputSchema: {
      type: "object",
      required: ["to"],
      properties: { to: { type: "string", format: "email" } },
    },
    invoke,
  }]));
}
