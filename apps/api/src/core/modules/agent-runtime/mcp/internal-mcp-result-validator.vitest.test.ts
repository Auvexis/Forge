import { describe, expect, it } from "vitest";
import { validateInternalMcpResult } from "./internal-mcp-result-validator.ts";

const call = { id: "call_1", name: "drive_download", arguments: { id: "file_1" } };

describe("validateInternalMcpResult", () => {
  it("accepts a correlated successful result", () => {
    expect(() => validateInternalMcpResult(call, {
      call,
      content: { ref: "artifact://file_1" },
      toolCall: {
        toolCallId: call.id,
        name: call.name,
        status: "success",
      },
    })).not.toThrow();
  });

  it("rejects a result correlated to another call", () => {
    expect(() => validateInternalMcpResult(call, {
      call: { ...call, id: "call_other" },
      content: null,
      toolCall: {
        toolCallId: "call_other",
        name: call.name,
        status: "success",
      },
    })).toThrow(/does not match/);
  });

  it("rejects oversized and cyclic results", () => {
    expect(() => validateInternalMcpResult(call, resultWith("x".repeat(600_000))))
      .toThrow(/maximum payload size/);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => validateInternalMcpResult(call, resultWith(cyclic)))
      .toThrow(/JSON serializable/);
  });

  it("rejects output that violates the plugin response schema", () => {
    const schema = {
      type: "object",
      required: ["id"],
      additionalProperties: false,
      properties: { id: { type: "string" } },
    };

    expect(() => validateInternalMcpResult(call, resultWith({ id: "file_1" }), schema))
      .not.toThrow();
    expect(() => validateInternalMcpResult(call, resultWith({ id: 42 }), schema))
      .toThrow(/declared schema/);
  });
});

function resultWith(content: unknown) {
  return {
    call,
    content,
    toolCall: {
      toolCallId: call.id,
      name: call.name,
      status: "success",
    },
  };
}
