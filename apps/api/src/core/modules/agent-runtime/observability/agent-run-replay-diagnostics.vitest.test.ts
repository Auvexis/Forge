import { describe, expect, it } from "vitest";
import { AgentRunReplayDiagnosticsService } from "./agent-run-replay-diagnostics.ts";

describe("AgentRunReplayDiagnosticsService", () => {
  it("correlates requests and responses and redacts secrets", () => {
    const service = new AgentRunReplayDiagnosticsService(
      {
        listByRun: () => [{
          kind: "tool",
          id: "request_1",
          idempotencyKey: "run_1:call_1",
          runId: "run_1",
          iteration: 1,
          toolCallId: "call_1",
          actionId: "action_1",
          toolName: "send_email",
          arguments: { recipient: "a@example.com", apiKey: "secret" },
          status: "completed",
          createdAt: "2026-07-30T00:00:00.000Z",
          updatedAt: "2026-07-30T00:00:01.000Z",
        }],
      } as never,
      {
        listByRun: () => [{
          id: "response_1",
          requestId: "request_1",
          runId: "run_1",
          toolCallId: "call_1",
          status: "succeeded",
          output: { messageId: "message_1" },
          createdAt: "2026-07-30T00:00:01.000Z",
        }],
      } as never,
      () => "2026-07-30T00:01:00.000Z",
    );

    const diagnostics = service.build("run_1");

    expect(diagnostics.entries).toHaveLength(1);
    expect(diagnostics.entries[0]?.response).toMatchObject({ status: "succeeded" });
    expect(diagnostics.entries[0]?.request).toMatchObject({
      arguments: { apiKey: "[REDACTED]" },
    });
  });
});
