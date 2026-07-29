import { describe, expect, it, vi } from "vitest";
import { InternalMcpClient } from "./internal-mcp-client.ts";
import { InternalMcpServer } from "./internal-mcp-server.ts";

describe("InternalMcpArgumentValidator", () => {
  it("validates required arguments before invoking a tool", async () => {
    const invoke = vi.fn(async () => ({ ok: true }));
    const client = createClient(invoke);

    await expect(client.callTool({
      id: "call_1",
      name: "email_send",
      arguments: {},
    })).rejects.toMatchObject({ code: "AGENT_TOOL_ARGUMENTS_INVALID", statusCode: 400 });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("rejects unknown arguments even when a provider schema allows them", async () => {
    const invoke = vi.fn(async () => ({ ok: true }));
    const client = createClient(invoke);

    await expect(client.callTool({
      id: "call_1",
      name: "email_send",
      arguments: { to: "user@example.com", injected: true },
    })).rejects.toMatchObject({ code: "AGENT_TOOL_ARGUMENTS_INVALID" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("invokes a tool only after successful validation", async () => {
    const invoke = vi.fn(async () => ({ ok: true }));
    const client = createClient(invoke);

    await expect(client.callTool({
      id: "call_1",
      name: "email_send",
      arguments: { to: "user@example.com" },
    })).resolves.toMatchObject({ content: { ok: true } });
    expect(invoke).toHaveBeenCalledWith({ to: "user@example.com" });
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
      additionalProperties: true,
      properties: {
        to: { type: "string", format: "email" },
      },
    },
    invoke,
  }]));
}
