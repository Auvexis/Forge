import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import { AGENT_LIMITS } from "./agent-limits.ts";
import { sanitizeAgentEventPayload, truncateAgentText } from "./agent-event-sanitizer.ts";

describe("agent event sanitizer", () => {
  it("redacts secret-like keys recursively", () => {
    const sanitized = sanitizeAgentEventPayload({
      api_key: "sk-test",
      nested: {
        authorization: "Bearer token",
        safe: "visible",
      },
    });

    assert.deepEqual(sanitized, {
      api_key: "[REDACTED]",
      nested: {
        authorization: "[REDACTED]",
        safe: "visible",
      },
    });
  });

  it("truncates long strings", () => {
    const value = "x".repeat(AGENT_LIMITS.maxEventBodyChars + 20);
    assert.match(truncateAgentText(value), /\[truncated 20 chars\]$/);
  });

  it("preserves useful tool input and output shape", () => {
    const sanitized = sanitizeAgentEventPayload({
      tool: "github_create_issue",
      input: { title: "Bug", labels: ["bug"] },
      output: { issueNumber: 123 },
    });

    assert.deepEqual(sanitized, {
      tool: "github_create_issue",
      input: { title: "Bug", labels: ["bug"] },
      output: { issueNumber: 123 },
    });
  });

  it("replaces binary and stream values with lightweight metadata", () => {
    const stream = Readable.from(Buffer.alloc(1024, "a"));
    const sanitized = sanitizeAgentEventPayload({
      args: {
        buffer: Buffer.alloc(2048, "b"),
        stream,
      },
    });

    assert.deepEqual(sanitized, {
      args: {
        buffer: { type: "Buffer", size: 2048 },
        stream: { type: "Readable" },
      },
    });
  });

  it("does not mutate the original payload", () => {
    const original = { token: "secret", nested: { password: "hidden" } };
    const sanitized = sanitizeAgentEventPayload(original);

    assert.notEqual(sanitized, original);
    assert.deepEqual(original, { token: "secret", nested: { password: "hidden" } });
  });
});
