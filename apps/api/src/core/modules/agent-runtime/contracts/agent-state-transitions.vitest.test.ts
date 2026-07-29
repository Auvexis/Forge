import { describe, expect, it } from "vitest";
import {
  assertAgentActionTransition,
  assertAgentRunTransition,
} from "./agent-state-transitions.ts";

describe("agent state transitions", () => {
  it("allows resumable run transitions", () => {
    expect(() => assertAgentRunTransition("running", "waiting-user")).not.toThrow();
    expect(() => assertAgentRunTransition("waiting-user", "running")).not.toThrow();
  });

  it("rejects transitions from terminal runs", () => {
    expect(() => assertAgentRunTransition("completed", "running")).toThrow(
      "Invalid agent run transition",
    );
  });

  it("allows action retry without reopening completed actions", () => {
    expect(() => assertAgentActionTransition("failed", "ready")).not.toThrow();
    expect(() => assertAgentActionTransition("completed", "ready")).toThrow(
      "Invalid agent action transition",
    );
  });

  it("allows a prepared action to wait for missing user input", () => {
    expect(() => assertAgentActionTransition("ready", "waiting-user")).not.toThrow();
    expect(() => assertAgentActionTransition("waiting-user", "ready")).not.toThrow();
  });
});
