import { describe, expect, it } from "vitest";
import { InternalMcpToolCatalog } from "./internal-mcp-tool-catalog.ts";

describe("InternalMcpToolCatalog", () => {
  it("projects only the tools explicitly supplied by the agent node", () => {
    const catalog = new InternalMcpToolCatalog([
      {
        name: "drive_download",
        summary: "Download a Drive file",
        sideEffect: "read",
        requiresApproval: false,
        timeoutMs: 30_000,
        inputSchema: { type: "object", required: ["fileId"] },
        invoke: async () => null,
      },
    ]);

    expect(catalog.listCards()).toEqual([
      {
        name: "drive_download",
        summary: "Download a Drive file",
        aliases: ["drive", "download"],
        sideEffect: "read",
      },
    ]);
    expect(catalog.get("drive_download").inputSchema.required).toEqual(["fileId"]);
    expect(() => catalog.get("youtube_upload")).toThrow("Unknown connected agent tool");
  });

  it("rejects ambiguous duplicate tool names", () => {
    const tool = {
      name: "send",
      summary: "Send",
      sideEffect: "write" as const,
      requiresApproval: true,
      timeoutMs: 30_000,
      inputSchema: { type: "object" },
      invoke: async () => null,
    };
    expect(() => new InternalMcpToolCatalog([tool, tool])).toThrow("Duplicate connected agent tool");
  });

  it("rejects oversized catalogs and schemas", () => {
    const tools = Array.from({ length: 65 }, (_, index) => tool(`tool_${index}`));
    expect(() => new InternalMcpToolCatalog(tools)).toThrow(/more than 64/);
    expect(() => new InternalMcpToolCatalog([{
      ...tool("oversized"),
      inputSchema: {
        type: "object",
        description: "x".repeat(70_000),
      },
    }])).toThrow(/oversized schema/);
  });

  it("rejects external schema references", () => {
    expect(() => new InternalMcpToolCatalog([{
      ...tool("external"),
      inputSchema: {
        type: "object",
        properties: {
          payload: { $ref: "https://example.com/schema.json" },
        },
      },
    }])).toThrow(/external schema reference/);
  });
});

function tool(name: string) {
  return {
    name,
    summary: "Tool",
    sideEffect: "read" as const,
    requiresApproval: false,
    timeoutMs: 30_000,
    inputSchema: { type: "object" },
    invoke: async () => null,
  };
}
