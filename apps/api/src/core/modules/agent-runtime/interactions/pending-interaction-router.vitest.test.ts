import { describe, expect, it } from "vitest";
import type { AgentPendingInteraction } from "../contracts/agent-domain-contracts.ts";
import { routePendingInteractionReply } from "./pending-interaction-router.ts";

describe("routePendingInteractionReply", () => {
  it.each([
    ["Cancelar", { type: "cancel" }],
    ["tente novamente", { type: "retry" }],
    ["prossiga", { type: "continue" }],
  ])("routes control reply %s without an LLM", (message, expected) => {
    expect(routePendingInteractionReply(interaction("clarification"), message)).toEqual(expected);
  });

  it("routes approvals and rejections", () => {
    expect(routePendingInteractionReply(interaction("approval"), "sim")).toEqual({
      type: "confirm",
      confirmed: true,
    });
    expect(routePendingInteractionReply(interaction("approval"), "não")).toEqual({
      type: "confirm",
      confirmed: false,
    });
  });

  it("normalizes numeric and textual selections", () => {
    expect(routePendingInteractionReply(interaction("selection"), "opção 2")).toEqual({
      type: "selection",
      value: "opção 2",
      index: 1,
    });
    expect(routePendingInteractionReply(interaction("selection"), "X.mp4")).toEqual({
      type: "selection",
      value: "X.mp4",
    });
  });
});

function interaction(kind: AgentPendingInteraction["kind"]): AgentPendingInteraction {
  return {
    id: "interaction_1",
    runId: "run_1",
    kind,
    question: "Question?",
    context: {},
    status: "pending",
  };
}
