import { describe, expect, it, vi } from "vitest";
import { collectAgentResponse } from "./agent-response-stream.ts";
import { StructuredTurnStreamingModel } from "./structured-turn-streaming-model.ts";

describe("StructuredTurnStreamingModel", () => {
  it("normalizes the current structured model API into processor events", async () => {
    const invokeJson = vi.fn();
    const model = new StructuredTurnStreamingModel({
      async invokeJson<T extends object>() {
        invokeJson();
        return {
          type: "tool-calls",
          calls: [{
            id: "call_1",
            name: "drive_download",
            arguments: { file: "X.mp4" },
          }],
        } as T;
      },
    });
    const result = await collectAgentResponse(model.stream({
      messages: [{ role: "user", content: "Baixe X.mp4" }],
      tools: [{
        name: "drive_download",
        description: "Download a file",
        inputSchema: { type: "object" },
      }],
    }));

    expect(result.toolCalls).toEqual([{
      callId: "call_1",
      toolName: "drive_download",
      input: { file: "X.mp4" },
      providerExecuted: false,
      commitmentIds: [],
    }]);
    expect(invokeJson).toHaveBeenCalledOnce();
  });

  it("repairs one unsupported decision instead of fabricating a generic reply", async () => {
    let attempt = 0;
    const model = new StructuredTurnStreamingModel({
      async invokeJson<T extends object>() {
        attempt += 1;
        return (attempt === 1
          ? { mode: "action", actions: [] }
          : {
              type: "tool-calls",
              calls: [{ id: "call_1", name: "drive_search", arguments: { query: "curriculo backend" } }],
            }) as T;
      },
    });

    const result = await collectAgentResponse(model.stream({
      messages: [{ role: "user", content: "Busque meu currículo de backend" }],
      tools: [{ name: "drive_search", description: "Search Drive", inputSchema: { type: "object" } }],
    }));

    expect(attempt).toBe(2);
    expect(result.toolCalls[0]?.toolName).toBe("drive_search");
    expect(result.text).not.toContain("mais informações");
  });

  it("turns an explicit clarification into a resumable processor pause", async () => {
    const model = new StructuredTurnStreamingModel({
      async invokeJson<T extends object>() {
        return { mode: "clarify", question: "Qual arquivo devo enviar?" } as T;
      },
    });

    await expect(collectAgentResponse(model.stream({
      messages: [{ role: "user", content: "Envie o arquivo" }],
      tools: [],
    }))).rejects.toMatchObject({
      kind: "clarification",
      question: "Qual arquivo devo enviar?",
    });
  });

  it("fails visibly after an invalid repair response", async () => {
    const model = new StructuredTurnStreamingModel({
      async invokeJson<T extends object>() {
        return { unexpected: true } as T;
      },
    });

    await expect(collectAgentResponse(model.stream({
      messages: [{ role: "user", content: "Execute" }],
      tools: [],
    }))).rejects.toMatchObject({ code: "AGENT_MODEL_PROTOCOL_INVALID" });
  });
});
