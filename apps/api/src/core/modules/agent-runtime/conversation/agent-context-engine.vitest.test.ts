import { describe, expect, it } from "vitest";
import type {
  AgentMessagePart,
  AgentMessageWithParts,
  AgentSessionSnapshot,
} from "../session/agent-session-contracts.ts";
import { AgentContextEngine, contextBudgetChars } from "./agent-context-engine.ts";

describe("AgentContextEngine", () => {
  it("keeps canonical tool calls adjacent to their results", () => {
    const snapshot = makeSnapshot([
      message("user_1", "turn_1", "user", 1, [text("user_1", "turn_1", "Download X")]),
      message("assistant_1", "turn_1", "assistant", 2, [
        tool("assistant_1", "turn_1", "call_1", "drive_download", {
          ref: "artifact://video_1",
        }),
      ]),
    ]);

    const projection = new AgentContextEngine().build(snapshot);

    expect(projection.messages).toEqual([
      expect.objectContaining({ role: "user", content: "Download X" }),
      expect.objectContaining({
        role: "assistant",
        tool_calls: [expect.objectContaining({ id: "call_1", name: "drive_download" })],
      }),
      expect.objectContaining({
        role: "tool",
        tool_call_id: "call_1",
        content: expect.stringContaining("artifact://video_1"),
      }),
    ]);
  });

  it("compacts whole old turns and retains recent turns intact", () => {
    const messages: AgentMessageWithParts[] = [];
    for (let index = 1; index <= 8; index += 1) {
      messages.push(message(
        `user_${index}`,
        `turn_${index}`,
        "user",
        index,
        [text(`user_${index}`, `turn_${index}`, `Request ${index} ${"x".repeat(700)}`)],
      ));
    }
    const projection = new AgentContextEngine().build(makeSnapshot(messages), {
      contextWindowTokens: 1_024,
      reservedOutputTokens: 256,
    });

    expect(projection.compactedTurnCount).toBeGreaterThan(0);
    expect(projection.messages[0]).toMatchObject({
      role: "system",
      content: expect.stringContaining("earlier completed turns"),
    });
    expect(projection.messages.at(-1)?.content).toContain("Request 8");
  });

  it("uses bounded provider context budgets", () => {
    expect(contextBudgetChars({
      contextWindowTokens: 8_000,
      reservedOutputTokens: 2_000,
    })).toBe(24_000);
  });
});

const now = "2026-07-30T00:00:00.000Z";

function makeSnapshot(messages: AgentMessageWithParts[]): AgentSessionSnapshot {
  return {
    session: {
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
      state: "active",
      revision: 10,
      createdAt: now,
      updatedAt: now,
    },
    activeTurn: null,
    messages,
    pendingInteraction: null,
    revision: 10,
  };
}

function message(
  id: string,
  turnId: string,
  role: "user" | "assistant",
  sequence: number,
  parts: AgentMessagePart[],
): AgentMessageWithParts {
  return {
    message: {
      id,
      sessionId: "session_1",
      turnId,
      role,
      sequence,
      createdAt: now,
    },
    parts,
  };
}

function text(messageId: string, turnId: string, value: string): AgentMessagePart {
  return {
    id: `part_${messageId}`,
    sessionId: "session_1",
    turnId,
    messageId,
    type: "text",
    sequence: 1,
    text: value,
    state: "completed",
    createdAt: now,
    updatedAt: now,
  };
}

function tool(
  messageId: string,
  turnId: string,
  callId: string,
  toolName: string,
  output: unknown,
): AgentMessagePart {
  return {
    id: `part_${callId}`,
    sessionId: "session_1",
    turnId,
    messageId,
    type: "tool",
    sequence: 1,
    callId,
    toolName,
    state: {
      status: "completed",
      input: { file: "X" },
      output,
      startedAt: now,
      completedAt: now,
      attempt: 1,
    },
    createdAt: now,
    updatedAt: now,
  };
}
