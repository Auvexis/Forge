import { describe, expect, it } from "vitest";
import { AgentRuntimeError } from "../agent-errors.ts";
import { normalizeInternalMcpError } from "./internal-mcp-error.ts";

describe("normalizeInternalMcpError", () => {
  it.each([
    ["AUTH_EXPIRED", 401, "authentication", false, true],
    ["DRIVE_PERMISSION_DENIED", 403, "permission", false, true],
    ["FILE_NOT_FOUND", 404, "not-found", false, true],
    ["MULTIPLE_MATCHES", 409, "ambiguous", false, true],
    ["PROVIDER_RATE_LIMITED", 429, "rate-limit", true, false],
    ["AGENT_TOOL_TIMEOUT", 504, "temporary", true, false],
    ["AGENT_TOOL_ARGS_INVALID", 400, "validation", false, false],
  ] as const)(
    "maps %s to a structured MCP error",
    (code, statusCode, category, retryable, userActionRequired) => {
      const result = normalizeInternalMcpError(
        new AgentRuntimeError("internal detail", code, "Safe message", statusCode),
        "drive_download",
      );
      expect(result).toEqual({
        code,
        category,
        message: "Safe message",
        retryable,
        userActionRequired,
      });
    },
  );

  it("does not expose unknown exception messages", () => {
    const result = normalizeInternalMcpError(
      new Error("token=super-secret"),
      "email_send",
    );
    expect(result).toMatchObject({
      code: "AGENT_TOOL_EXECUTION_FAILED",
      category: "internal",
      message: "Tool email_send failed",
    });
    expect(result.message).not.toContain("super-secret");
  });
});
