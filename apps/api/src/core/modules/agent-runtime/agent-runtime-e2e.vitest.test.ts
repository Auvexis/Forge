import { describe, expect, it } from "vitest";
import {
  advanceResumableMcpAgentLoop,
  createResumableMcpLoopState,
  type ResumableMcpLoopState,
  type ResumableMcpLoopStep,
} from "./loop/resumable-mcp-agent-loop.ts";

describe("canonical agent runtime end to end", () => {
  it("answers chat without dispatching a tool", async () => {
    const step = await advanceResumableMcpAgentLoop(harness([
      { mode: "chat", response: "Olá! Como posso ajudar?" },
    ]));

    expect(step).toMatchObject({
      type: "final",
      response: "Olá! Como posso ajudar?",
      state: { iterationCount: 1, toolCallCount: 0 },
    });
  });

  it("runs Drive list-download-email one durable request at a time", async () => {
    const completed = await runSequence(
      [
        { mode: "tool", toolName: "drive_list", objective: "Find backend CV" },
        { action: "call", arguments: { query: "andresimoes backend pdf" } },
        { mode: "tool", toolName: "drive_download", objective: "Download selected CV" },
        { action: "call", arguments: { fileId: "file_cv" } },
        { mode: "tool", toolName: "gmail_send", objective: "Email CV" },
        {
          action: "call",
          arguments: {
            to: "andre.emailto@gmail.com",
            attachmentRef: "artifact://cv",
          },
        },
        { mode: "chat", response: "Currículo enviado." },
      ],
      {
        drive_list: [{ id: "file_cv", name: "andresimoes-jr-backend.pdf" }],
        drive_download: { artifactRef: "artifact://cv" },
        gmail_send: { messageId: "email_1" },
      },
    );

    expect(completed.type).toBe("final");
    expect(completed.state.completed.map(({ toolName }) => toolName)).toEqual([
      "drive_list",
      "drive_download",
      "gmail_send",
    ]);
    expect(completed.state.toolCallCount).toBe(3);
  });

  it("runs Drive-download-YouTube without planning the full chain", async () => {
    const completed = await runSequence(
      [
        { mode: "tool", toolName: "drive_list", objective: "Find video" },
        { action: "call", arguments: { query: "X.mp4" } },
        { mode: "tool", toolName: "drive_download", objective: "Download video" },
        { action: "call", arguments: { fileId: "video_1" } },
        { mode: "tool", toolName: "youtube_upload", objective: "Publish video" },
        { action: "call", arguments: { artifactRef: "artifact://video" } },
        { mode: "chat", response: "Vídeo publicado." },
      ],
      {
        drive_list: [{ id: "video_1", name: "X.mp4" }],
        drive_download: { artifactRef: "artifact://video" },
        youtube_upload: { videoId: "youtube_1" },
      },
    );

    expect(completed.type).toBe("final");
    expect(completed.state.completed.map(({ toolName }) => toolName)).toEqual([
      "drive_list",
      "drive_download",
      "youtube_upload",
    ]);
  });

  it("stops before a model decision when the run is cancelled", async () => {
    const controller = new AbortController();
    controller.abort(new Error("Cancelled by user"));

    await expect(advanceResumableMcpAgentLoop({
      ...harness([{ mode: "chat", response: "Should not run" }]),
      abortSignal: controller.signal,
    })).rejects.toThrow("Cancelled by user");
  });
});

async function runSequence(
  decisions: unknown[],
  outputs: Record<string, unknown>,
): Promise<ResumableMcpLoopStep> {
  const input = harness(decisions);
  let state: ResumableMcpLoopState = createResumableMcpLoopState();
  let response: Parameters<typeof advanceResumableMcpAgentLoop>[0]["response"];
  for (let index = 0; index < 10; index += 1) {
    const step = await advanceResumableMcpAgentLoop({ ...input, state, response });
    state = step.state;
    response = undefined;
    if (step.type !== "request") return step;
    response = {
      id: `response_${index}`,
      requestId: step.request.id,
      runId: step.request.runId,
      toolCallId: step.request.toolCallId,
      status: "succeeded",
      output: outputs[step.request.toolName],
      createdAt: new Date().toISOString(),
    };
  }
  throw new Error("Agent sequence did not terminate");
}

function harness(decisions: unknown[]) {
  const schemas: Record<string, Record<string, unknown>> = {
    drive_list: {
      type: "object",
      required: ["query"],
      properties: { query: { type: "string" } },
    },
    drive_download: {
      type: "object",
      required: ["fileId"],
      properties: { fileId: { type: "string" } },
    },
    gmail_send: {
      type: "object",
      required: ["to", "attachmentRef"],
      properties: {
        to: { type: "string" },
        attachmentRef: { type: "string" },
      },
    },
    youtube_upload: {
      type: "object",
      required: ["artifactRef"],
      properties: { artifactRef: { type: "string" } },
    },
  };
  return {
    runId: "run_e2e",
    model: { invokeJson: async () => decisions.shift() as never },
    client: {
      listTools: () => Object.keys(schemas).map((name) => ({
        name,
        summary: name,
        sideEffect: "read",
      })),
      describeTool: (name: string) => ({
        name,
        summary: name,
        pluginId: name.split("_")[0],
        inputSchema: schemas[name],
      }),
      validateToolArguments: (name: string, value: Record<string, unknown>) => {
        const required = schemas[name]?.required as string[] | undefined;
        if (required?.some((key) => typeof value[key] !== "string")) {
          throw new Error(`Invalid ${name} arguments`);
        }
      },
    } as never,
    systemPrompt: "Complete the request.",
    userMessage: "Execute the request.",
    contextMessages: [],
    state: createResumableMcpLoopState(),
    maxIterations: 12,
    maxToolCalls: 6,
  };
}
