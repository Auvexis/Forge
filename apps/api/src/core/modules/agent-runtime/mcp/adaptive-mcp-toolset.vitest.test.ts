import { describe, expect, it, vi } from "vitest";
import { InternalMcpClient } from "./internal-mcp-client.ts";
import { InternalMcpServer } from "./internal-mcp-server.ts";
import type { InternalMcpTool } from "./internal-mcp-types.ts";
import { AdaptiveMcpToolset } from "./adaptive-mcp-toolset.ts";

function tool(name: string, summary = name): InternalMcpTool {
  return {
    name,
    summary,
    sideEffect: "read",
    requiresApproval: false,
    timeoutMs: 1_000,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { query: { type: "string" } },
    },
    invoke: vi.fn(async () => ({ ok: true })),
  };
}

describe("AdaptiveMcpToolset", () => {
  it("sends full schemas directly for a small catalog", () => {
    const toolset = new AdaptiveMcpToolset(
      new InternalMcpClient(new InternalMcpServer([tool("drive_download")])),
    );

    expect(toolset.listForModel()).toEqual([expect.objectContaining({
      name: "drive_download",
      inputSchema: expect.objectContaining({ type: "object" }),
    })]);
  });

  it("discovers and activates schemas for a large catalog", async () => {
    const tools = [
      tool("drive_download", "Download files from Drive"),
      tool("youtube_publish", "Publish a video"),
      tool("email_send", "Send email"),
    ];
    const toolset = new AdaptiveMcpToolset(
      new InternalMcpClient(new InternalMcpServer(tools)),
      { directSchemaLimit: 1 },
    );

    expect(toolset.listForModel().map((item) => item.name)).toEqual([
      "fabric_search_tools",
      "fabric_describe_tools",
    ]);
    const search = await toolset.call({
      id: "call_1",
      name: "fabric_search_tools",
      arguments: { query: "download drive" },
    });
    expect(search.content).toMatchObject({
      tools: [expect.objectContaining({ name: "drive_download" })],
    });
    await toolset.call({
      id: "call_2",
      name: "fabric_describe_tools",
      arguments: { names: ["drive_download"] },
    });
    expect(toolset.listForModel().map((item) => item.name)).toContain("drive_download");
  });

  it("reuses immutable schemas by their stable content hash", () => {
    const first = new AdaptiveMcpToolset(
      new InternalMcpClient(new InternalMcpServer([tool("first")])),
    ).listForModel()[0]!.inputSchema;
    const second = new AdaptiveMcpToolset(
      new InternalMcpClient(new InternalMcpServer([tool("second")])),
    ).listForModel()[0]!.inputSchema;

    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
  });
});
