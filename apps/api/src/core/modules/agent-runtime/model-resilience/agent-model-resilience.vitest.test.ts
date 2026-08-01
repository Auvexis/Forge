import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { AgentRuntimeError } from "../agent-errors.ts";
import type { AgentRuntimeModel } from "../agent-runtime-model.ts";
import {
  classifyModelFailure,
  withAgentModelResilience,
} from "./agent-model-resilience-policy.ts";
import { stopReasonForError } from "./agent-stop-reason.ts";

const decisionSchema = {
  type: "object",
  oneOf: [
    {
      required: ["mode", "response"],
      additionalProperties: false,
      properties: {
        mode: { const: "chat" },
        response: { type: "string", minLength: 1 },
      },
    },
    {
      required: ["mode", "question"],
      additionalProperties: false,
      properties: {
        mode: { const: "clarify" },
        question: { type: "string", minLength: 1 },
      },
    },
    {
      required: ["mode", "toolName", "objective"],
      additionalProperties: false,
      properties: {
        mode: { const: "tool" },
        toolName: { const: "drive_list" },
        objective: { type: "string", minLength: 1 },
      },
    },
  ],
};

describe("agent model resilience policy", () => {
  it.each(fixtures())("repairs $modelClass Ollama-shaped decisions", async (fixture) => {
    const invokeJson = vi.fn()
      .mockResolvedValueOnce(fixture.invalid)
      .mockResolvedValueOnce(fixture.repaired);
    const model = withAgentModelResilience(runtimeModel(
      invokeJson as unknown as AgentRuntimeModel["invokeJson"],
    ));

    await expect(model.invokeJson({
      messages: [{ role: "user", content: "Find my CV" }],
      schema: decisionSchema,
    })).resolves.toEqual(fixture.repaired);
    expect(invokeJson).toHaveBeenCalledTimes(2);
    expect(invokeJson.mock.calls[1]![0].messages.at(-1)?.content).toContain("REPAIR");
  });

  it("uses the fallback model after a retryable primary failure", async () => {
    const primary = runtimeModel(vi.fn(async () => {
      throw new AgentRuntimeError("timeout", "AGENT_MODEL_TIMEOUT", "timeout", 504);
    }));
    const fallbackInvoke = vi.fn(async () => ({ mode: "chat", response: "Recovered." }));
    const model = withAgentModelResilience(
      primary,
      runtimeModel(fallbackInvoke as unknown as AgentRuntimeModel["invokeJson"]),
    );

    await expect(model.invokeJson({ messages: [], schema: decisionSchema }))
      .resolves.toMatchObject({ response: "Recovered." });
    expect(fallbackInvoke).toHaveBeenCalledOnce();
  });

  it("normalizes common provider-native tool decisions before validation", async () => {
    const invokeJson = vi.fn(async () => ({
      tool: "drive_list",
      arguments: { query: "backend" },
    }));
    const model = withAgentModelResilience(runtimeModel(
      invokeJson as unknown as AgentRuntimeModel["invokeJson"],
    ));

    await expect(model.invokeJson({ messages: [], schema: decisionSchema })).resolves.toEqual({
      mode: "tool",
      toolName: "drive_list",
      objective: "Execute drive_list",
    });
    expect(invokeJson).toHaveBeenCalledOnce();
  });

  it.each([
    ["AGENT_MODEL_TIMEOUT", 504, "timeout", true],
    ["AGENT_MODEL_JSON_INVALID", 502, "protocol", true],
    ["AGENT_MODEL_EMPTY_RESPONSE", 502, "empty", true],
    ["AGENT_MODEL_BAD_REQUEST", 400, "permanent", false],
  ] as const)("classifies %s deterministically", (code, status, category, _retryable) => {
    const error = new AgentRuntimeError(code, code, code, status);
    expect(classifyModelFailure(error)).toBe(category);
  });

  it("maps terminal errors to deterministic stop reasons", () => {
    expect(stopReasonForError(new AgentRuntimeError("", "AGENT_MODEL_TIMEOUT"))).toBe("model-error");
    expect(stopReasonForError(new AgentRuntimeError("", "AGENT_TOOL_LIMIT_EXCEEDED"))).toBe("tool-call-limit");
    expect(stopReasonForError(new AgentRuntimeError("", "AGENT_ITERATION_LIMIT_EXCEEDED"))).toBe("iteration-limit");
  });
});

function runtimeModel(invokeJson: AgentRuntimeModel["invokeJson"]): AgentRuntimeModel {
  return {
    invokeJson,
    generateFinalResponse: async () => "done",
  };
}

function fixtures(): Array<{
  modelClass: string;
  invalid: Record<string, unknown>;
  repaired: Record<string, unknown>;
}> {
  return JSON.parse(readFileSync(
    new URL("./fixtures/ollama-small-model-decisions.json", import.meta.url),
    "utf8",
  ));
}
