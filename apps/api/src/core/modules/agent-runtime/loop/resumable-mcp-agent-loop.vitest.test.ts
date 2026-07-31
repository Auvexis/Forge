import { describe, expect, it } from "vitest";
import {
  advanceResumableMcpAgentLoop,
  createResumableMcpLoopState,
  type ResumableMcpLoopState,
} from "./resumable-mcp-agent-loop.ts";

describe("advanceResumableMcpAgentLoop", () => {
  it("returns one durable request and resumes only from its correlated response", async () => {
    const decisions = [
      { mode: "tool", toolName: "drive_list", objective: "Find CV" },
      { action: "call", arguments: { query: "backend" } },
      { mode: "chat", response: "Arquivo encontrado." },
    ];
    const input = baseInput(decisions);
    const requested = await advanceResumableMcpAgentLoop(input);
    expect(requested.type).toBe("request");
    if (requested.type !== "request") throw new Error("Expected request");
    expect(requested.request).toMatchObject({
      kind: "tool",
      runId: "run_1",
      iteration: 1,
      toolName: "drive_list",
      arguments: { query: "backend" },
      status: "queued",
    });
    expect(requested.state.pendingRequest?.id).toBe(requested.request.id);

    const completed = await advanceResumableMcpAgentLoop({
      ...input,
      state: requested.state,
      response: {
        id: "response_1",
        requestId: requested.request.id,
        runId: "run_1",
        toolCallId: requested.request.toolCallId,
        status: "succeeded",
        output: [{ id: "file_1" }],
        createdAt: new Date().toISOString(),
      },
    });
    expect(completed).toMatchObject({
      type: "final",
      response: "Arquivo encontrado.",
      state: {
        iterationCount: 2,
        toolCallCount: 1,
        completed: [{ toolName: "drive_list", output: [{ id: "file_1" }] }],
      },
    });
    expect(completed.state.pendingRequest).toBeUndefined();
  });

  it("does not decide again while an engine request is pending", async () => {
    const decisions = [
      { mode: "tool", toolName: "drive_list", objective: "Find CV" },
      { action: "call", arguments: { query: "backend" } },
    ];
    const first = await advanceResumableMcpAgentLoop(baseInput(decisions));
    if (first.type !== "request") throw new Error("Expected request");

    await expect(advanceResumableMcpAgentLoop({
      ...baseInput([]),
      state: first.state,
    })).rejects.toMatchObject({ code: "AGENT_ENGINE_RESPONSE_PENDING" });
  });

  it("rejects responses that do not correlate to the pending request", async () => {
    const decisions = [
      { mode: "tool", toolName: "drive_list", objective: "Find CV" },
      { action: "call", arguments: { query: "backend" } },
    ];
    const first = await advanceResumableMcpAgentLoop(baseInput(decisions));
    if (first.type !== "request") throw new Error("Expected request");

    await expect(advanceResumableMcpAgentLoop({
      ...baseInput([]),
      state: first.state,
      response: {
        id: "response_wrong",
        requestId: "request_wrong",
        runId: "run_1",
        toolCallId: first.request.toolCallId,
        status: "succeeded",
        output: {},
        createdAt: new Date().toISOString(),
      },
    })).rejects.toMatchObject({ code: "AGENT_ENGINE_RESPONSE_MISMATCH" });
  });

  it("detects an engine response that was already consumed", async () => {
    await expect(advanceResumableMcpAgentLoop({
      ...baseInput([]),
      state: {
        ...createResumableMcpLoopState(),
        completed: [{
          toolCallId: "call_1",
          toolName: "drive_list",
          objective: "Find CV",
          arguments: { query: "backend" },
          output: [],
        }],
      },
      response: {
        id: "response_1",
        requestId: "request_1",
        runId: "run_1",
        toolCallId: "call_1",
        status: "succeeded",
        output: [],
        createdAt: new Date().toISOString(),
      },
    })).rejects.toMatchObject({ code: "AGENT_ENGINE_RESPONSE_DUPLICATE" });
  });

  it("enforces independent iteration and tool-call limits", async () => {
    await expect(advanceResumableMcpAgentLoop({
      ...baseInput([]),
      state: { ...createResumableMcpLoopState(), iterationCount: 2 },
      maxIterations: 2,
    })).rejects.toMatchObject({ code: "AGENT_ITERATION_LIMIT_EXCEEDED" });

    await expect(advanceResumableMcpAgentLoop({
      ...baseInput([{ mode: "tool", toolName: "drive_list", objective: "Find" }]),
      state: { ...createResumableMcpLoopState(), toolCallCount: 1 },
      maxToolCalls: 1,
    })).rejects.toMatchObject({ code: "AGENT_TOOL_LIMIT_EXCEEDED" });
  });

  it("guards duplicate side effects and empty final completions", async () => {
    const duplicateState: ResumableMcpLoopState = {
      ...createResumableMcpLoopState(),
      toolCallCount: 1,
      completed: [{
        toolName: "drive_list",
        objective: "Find",
        arguments: { query: "backend" },
        output: [{ id: "file_1" }],
        toolCallId: "call_1",
      }],
    };
    const duplicate = await advanceResumableMcpAgentLoop({
      ...baseInput([
        { mode: "tool", toolName: "drive_list", objective: "Find" },
        { action: "call", arguments: { query: "backend" } },
      ]),
      state: duplicateState,
    });
    expect(duplicate).toMatchObject({ type: "interaction" });
    expect(duplicate.state.rejectedDuplicates).toHaveLength(1);

    await expect(advanceResumableMcpAgentLoop({
      ...baseInput([{ mode: "chat", response: "" }]),
      state: duplicateState,
    })).rejects.toMatchObject({ code: "AGENT_COMPLETION_INVALID" });
  });

  it("rejects a premature final answer and continues with the missing email tool", async () => {
    const decisions = [
      { mode: "chat", response: "O arquivo está pronto para envio." },
      { action: "call", arguments: { to: "andre@example.com" } },
    ];
    const input = baseInput(decisions);
    let modelCalls = 0;
    input.model = {
      invokeJson: async () => {
        modelCalls += 1;
        return decisions.shift() as any;
      },
    };
    input.userMessage = "Busque e baixe o currículo, depois envie por email para andre@example.com";
    input.client = {
      listTools: () => [
        { name: "drive_list", summary: "List Drive files", sideEffect: "read" },
        { name: "drive_download", summary: "Download a Drive file", sideEffect: "read" },
        { name: "gmail_send", summary: "Send an email", sideEffect: "external-message" },
      ],
      describeTool: (name: string) => ({
        name,
        pluginId: "google",
        inputSchema: {
          type: "object",
          required: ["to"],
          properties: { to: { type: "string" } },
        },
      }),
      validateToolArguments: () => undefined,
    } as any;
    input.state = {
      ...createResumableMcpLoopState(),
      iterationCount: 2,
      toolCallCount: 2,
      completed: [
        { toolName: "drive_list", objective: "Find", arguments: {}, output: [], toolCallId: "call_1" },
        { toolName: "drive_download", objective: "Download", arguments: {}, output: {}, toolCallId: "call_2" },
      ],
    };

    const step = await advanceResumableMcpAgentLoop(input);

    expect(step).toMatchObject({
      type: "request",
      request: { toolName: "gmail_send", arguments: { to: "andre@example.com" } },
      state: { iterationCount: 3, toolCallCount: 3 },
    });
    expect(modelCalls).toBe(2);
  });
});

function baseInput(decisions: unknown[]) {
  return {
    runId: "run_1",
    model: { invokeJson: async () => decisions.shift() as any },
    client: {
      listTools: () => [{ name: "drive_list", description: "List Drive files" }],
      describeTool: () => ({
        name: "drive_list",
        description: "List Drive files",
        pluginId: "google-drive",
        inputSchema: {
          type: "object",
          required: ["query"],
          properties: { query: { type: "string" } },
        },
      }),
      validateToolArguments: (_name: string, value: Record<string, unknown>) => {
        if (typeof value.query !== "string") throw new Error("query is required");
      },
    } as any,
    systemPrompt: "",
    userMessage: "Find my backend CV",
    contextMessages: [],
    state: createResumableMcpLoopState(),
    maxIterations: 8,
    maxToolCalls: 4,
  };
}
