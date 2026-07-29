import { describe, expect, it } from "vitest";
import { withAgentModelTimeout, type AgentRuntimeModel } from "./agent-runtime-model.ts";

describe("withAgentModelTimeout", () => {
  it("times out a model adapter that ignores abort signals", async () => {
    const never = new Promise<never>(() => undefined);
    const model: AgentRuntimeModel = {
      invokeJson: async () => await never,
      generateFinalResponse: async () => await never,
    };

    await expect(withAgentModelTimeout(model, 5).invokeJson({
      messages: [],
      schema: { type: "object" },
    })).rejects.toMatchObject({
      code: "AGENT_MODEL_TIMEOUT",
      statusCode: 504,
    });
  });
});
