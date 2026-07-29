import { describe, expect, it } from "vitest";
import { createAgentSideEffectKey } from "./agent-side-effect-key.ts";

describe("createAgentSideEffectKey", () => {
  it("is stable across argument key order", () => {
    expect(key({ to: "a@example.com", subject: "Hello" }))
      .toEqual(key({ subject: "Hello", to: "a@example.com" }));
  });

  it("differs for distinct actions using the same tool", () => {
    expect(key({ to: "a@example.com" }, "email_1").idempotencyKey)
      .not.toBe(key({ to: "a@example.com" }, "email_2").idempotencyKey);
  });
});

function key(arguments_: Record<string, unknown>, actionId = "email") {
  return createAgentSideEffectKey({
    profileId: "profile_1",
    runId: "run_1",
    actionId,
    toolName: "email_send",
    arguments: arguments_,
  });
}
