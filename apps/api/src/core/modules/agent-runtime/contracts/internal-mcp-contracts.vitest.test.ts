import { describe, expect, it } from "vitest";
import {
  INTERNAL_MCP_PROTOCOL_VERSION,
  type InternalMcpCallToolRequest,
} from "./internal-mcp-contracts.ts";

describe("internal MCP contracts", () => {
  it("correlates a tool call with run, action, and call identifiers", () => {
    const request: InternalMcpCallToolRequest = {
      protocolVersion: INTERNAL_MCP_PROTOCOL_VERSION,
      requestId: "request_1",
      method: "tools/call",
      payload: {
        runId: "run_1",
        actionId: "action_1",
        toolCallId: "call_1",
        name: "drive_download",
        arguments: { fileId: "file_1" },
      },
    };

    expect(request.payload).toMatchObject({
      runId: "run_1",
      actionId: "action_1",
      toolCallId: "call_1",
    });
  });
});
