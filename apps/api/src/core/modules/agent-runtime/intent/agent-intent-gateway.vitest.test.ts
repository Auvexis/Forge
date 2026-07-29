import { describe, expect, it } from "vitest";
import {
  routeAgentIntent,
  type AgentIntentDecision,
  type IntentModel,
} from "./agent-intent-gateway.ts";
import { SMALL_MODEL_INTENT_FIXTURES } from "./small-model-intent-fixtures.ts";
import type { InternalMcpToolCard } from "../mcp/internal-mcp-types.ts";

const tools: InternalMcpToolCard[] = [
  { name: "drive_download", summary: "Download a Drive file", sideEffect: "read" },
  { name: "email_send", summary: "Send an email", sideEffect: "external-message" },
  { name: "youtube_upload", summary: "Upload a YouTube video", sideEffect: "write" },
];

describe("routeAgentIntent", () => {
  it.each(SMALL_MODEL_INTENT_FIXTURES)(
    "normalizes the $id fixture",
    async ({ userMessage, expected }) => {
      const decision = await routeAgentIntent({
        model: fixedDecisionModel(expected),
        systemPrompt: "You are a concise assistant.",
        userMessage,
        contextMessages: [],
        tools,
      });

      expect(decision).toEqual(expected);
    },
  );

  it("gives small models explicit prepare-versus-execute and completeness rules", async () => {
    let systemMessage = "";
    const model: IntentModel = {
      async invokeJson<T extends object>(
        input: Parameters<IntentModel["invokeJson"]>[0],
      ): Promise<T> {
        systemMessage = input.messages[0]?.content ?? "";
        return { mode: "chat", response: "ok" } as T;
      },
    };

    await routeAgentIntent({
      model,
      systemPrompt: "Assistant",
      userMessage: "Draft it but do not send it.",
      contextMessages: [],
      tools,
    });

    expect(systemMessage).toContain("Never execute side effects for hypothetical");
    expect(systemMessage).toContain("include every requested operation exactly once");
    expect(systemMessage).toContain("The same tool may appear in multiple actions");
  });

  it("keeps repeated tools as separate actions with stable dependencies", async () => {
    const fixture = SMALL_MODEL_INTENT_FIXTURES.find(({ id }) => id === "en-repeated-tool")!;

    const decision = await routeAgentIntent({
      model: fixedDecisionModel(fixture.expected),
      systemPrompt: "Assistant",
      userMessage: fixture.userMessage,
      contextMessages: [],
      tools,
    });

    expect(decision.mode).toBe("action");
    if (decision.mode !== "action") return;
    expect(decision.actions.map(({ toolName }) => toolName)).toEqual(["email_send", "email_send"]);
    expect(decision.actions[1]?.dependsOn).toEqual(["email_ana"]);
  });
});

function fixedDecisionModel(decision: AgentIntentDecision): IntentModel {
  return {
    async invokeJson<T extends object>(): Promise<T> {
      return structuredClone(decision) as T;
    },
  };
}
