import { describe, expect, it } from "vitest";
import {
  isTerminalToolState,
  isTerminalTurnState,
  type AgentSessionSnapshot,
  type AgentToolPart,
} from "./agent-session-contracts.ts";

describe("agent session contracts", () => {
  it("distinguishes terminal turn states", () => {
    expect(isTerminalTurnState("running")).toBe(false);
    expect(isTerminalTurnState("waiting-user")).toBe(false);
    expect(isTerminalTurnState("completed")).toBe(true);
    expect(isTerminalTurnState("failed")).toBe(true);
    expect(isTerminalTurnState("cancelled")).toBe(true);
  });

  it("distinguishes terminal tool states", () => {
    expect(isTerminalToolState({ status: "pending" })).toBe(false);
    expect(isTerminalToolState({
      status: "running",
      input: {},
      startedAt: "2026-07-29T00:00:00.000Z",
      attempt: 1,
    })).toBe(false);
    expect(isTerminalToolState({
      status: "waiting-approval",
      input: {},
      startedAt: "2026-07-29T00:00:00.000Z",
      requestedAt: "2026-07-29T00:00:01.000Z",
      attempt: 1,
    })).toBe(false);
    expect(isTerminalToolState({
      status: "completed",
      input: {},
      output: { ok: true },
      startedAt: "2026-07-29T00:00:00.000Z",
      completedAt: "2026-07-29T00:00:01.000Z",
      attempt: 1,
    })).toBe(true);
  });

  it("represents a durable session snapshot with message parts", () => {
    const now = "2026-07-29T00:00:00.000Z";
    const tool: AgentToolPart = {
      id: "part_1",
      sessionId: "session_1",
      turnId: "turn_1",
      messageId: "message_1",
      sequence: 1,
      type: "tool",
      callId: "call_1",
      toolName: "drive_download",
      state: { status: "pending", input: { file: "X.mp4" } },
      createdAt: now,
      updatedAt: now,
    };
    const snapshot: AgentSessionSnapshot = {
      session: {
        id: "session_1",
        profileId: "profile_1",
        workflowId: "workflow_1",
        triggerNodeId: "trigger_1",
        title: "Download X.mp4",
        state: "active",
        revision: 2,
        createdAt: now,
        updatedAt: now,
      },
      activeTurn: {
        id: "turn_1",
        sessionId: "session_1",
        state: "running",
        sequence: 1,
        createdAt: now,
        updatedAt: now,
      },
      messages: [{
        message: {
          id: "message_1",
          sessionId: "session_1",
          turnId: "turn_1",
          role: "assistant",
          sequence: 1,
          createdAt: now,
        },
        parts: [tool],
      }],
      pendingInteraction: null,
      revision: 2,
    };

    expect(snapshot.messages[0]?.parts[0]).toEqual(tool);
    expect(snapshot.revision).toBe(snapshot.session.revision);
  });
});
