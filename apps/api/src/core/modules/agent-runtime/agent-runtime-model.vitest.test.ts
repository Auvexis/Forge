import { describe, expect, it, vi } from "vitest";
import { AgentRuntimeError } from "./agent-errors.ts";
import { toAgentRuntimeModel } from "./agent-runtime-model.ts";
import type { AgentModelMessage } from "./model-adapters/agent-model-adapter.ts";

const schema = {
  type: "object",
  required: ["mode"],
  additionalProperties: false,
  properties: { mode: { enum: ["chat", "action"] } },
};

describe("toAgentRuntimeModel capabilities", () => {
  it("uses provider structured output when declared", async () => {
    const invokeJson = vi.fn(async () => ({ mode: "chat" }));
    const invoke = vi.fn();
    const model = toAgentRuntimeModel({
      capabilities: {
        structuredOutput: "json-schema",
        nativeToolHistory: true,
        defaultContextTokens: 8_192,
        maxContextTokens: 32_768,
      },
      invokeJson,
      invoke,
    });

    await expect(model.invokeJson({ messages: [], schema })).resolves.toEqual({ mode: "chat" });
    expect(invokeJson).toHaveBeenCalledOnce();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("uses a strict validated text fallback when structured output is unavailable", async () => {
    const invoke = vi.fn(async (
      _messages: AgentModelMessage[],
      _options?: { signal?: AbortSignal },
    ) => ({ content: "{\"mode\":\"action\"}" }));
    const model = toAgentRuntimeModel({
      capabilities: {
        structuredOutput: "text",
        nativeToolHistory: false,
        defaultContextTokens: 4_096,
        maxContextTokens: 8_192,
      },
      invoke,
    });

    await expect(model.invokeJson({ messages: [], schema })).resolves.toEqual({ mode: "action" });
    expect(invoke.mock.calls[0]?.[0][0]?.content).toContain("Return exactly one JSON object");
  });

  it.each([
    "Here is the result: {\"mode\":\"chat\"}",
    "```json\n{\"mode\":\"chat\"}\n```",
    "{\"mode\":\"unknown\"}",
  ])("rejects unsafe or schema-invalid fallback output", async (content) => {
    const model = toAgentRuntimeModel({
      capabilities: {
        structuredOutput: "text",
        nativeToolHistory: false,
        defaultContextTokens: 4_096,
        maxContextTokens: 8_192,
      },
      invoke: async () => ({ content }),
    });

    await expect(model.invokeJson({ messages: [], schema })).rejects.toMatchObject({
      code: "AGENT_MODEL_JSON_INVALID",
    } satisfies Partial<AgentRuntimeError>);
  });
});
