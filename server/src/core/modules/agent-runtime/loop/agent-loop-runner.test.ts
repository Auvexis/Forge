import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "../agent-errors.ts";
import { runAgentLoop } from "./agent-loop-runner.ts";
import type { AgentPlanTool } from "../plan/agent-plan-types.ts";
import { AgentFileRefStore } from "./agent-file-ref-store.ts";

describe("agent loop runner", () => {
  it("retries a repairable tool error with compact sanitized history", async () => {
    const modelPrompts: string[] = [];
    const toolArgs: unknown[] = [];
    const decisions = [
      { action: "tool", toolName: "download", params: {}, reason: "Need file." },
      { action: "tool", toolName: "download", params: { fileId: "file_1" }, reason: "Retry with id." },
      { action: "final", response: "Arquivo baixado.", reason: "Done." },
    ];

    const result = await runAgentLoop({
      userMessage: "Baixe meu curriculo",
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs a tool.", confidence: 0.9 };
        },
        async invokeJson(input) {
          modelPrompts.push(input.messages.map((message) => message.content).join("\n"));
          return decisions.shift() as any;
        },
        async generateFinalResponse() {
          return "Arquivo baixado.";
        },
      },
      tools: [
        tool("download", async (args) => {
          toolArgs.push(args);
          if (!(args as any).fileId) {
            throw new AgentRuntimeError(
              "Missing fileId",
              "AGENT_TOOL_PARAM_MISSING",
              "Missing fileId",
              400,
            );
          }
          return {
            id: "file_1",
            data: Buffer.from("secret bytes"),
            base64: "a".repeat(2000),
          };
        }),
      ],
      emitEvent: () => {},
    });

    assert.equal(result.status, "success");
    assert.equal(result.output, "Arquivo baixado.");
    assert.deepEqual(toolArgs, [{}, { fileId: "file_1" }]);
    assert.match(modelPrompts[1] ?? "", /TOOL download ERROR Missing fileId/);
    assert.match(modelPrompts[2] ?? "", /"type":"buffer"/);
    assert.doesNotMatch(modelPrompts[2] ?? "", /a{100}/);
  });

  it("accepts common model aliases for loop tool and final decisions", async () => {
    const decisions = [
      {
        type: "tool_call",
        tool: "search_files",
        arguments: { query: "andresimoes", mimeType: "application/pdf" },
        thought: "Find the resume.",
      },
      {
        final_answer: "Curriculo enviado.",
      },
    ];
    const toolArgs: unknown[] = [];

    const result = await runAgentLoop({
      userMessage: "Procure pelo meu curriculo pdf chamado andresimoes no drive e depois baixe e envie por email para vaurvik@gmail.com",
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
        },
        async invokeJson() {
          return decisions.shift() as any;
        },
        async generateFinalResponse() {
          return "Curriculo enviado.";
        },
      },
      tools: [
        tool("search_files", async (args) => {
          toolArgs.push(args);
          return [{ id: "file_1", name: "andresimoes.pdf" }];
        }),
      ],
      emitEvent: () => {},
    });

    assert.equal(result.status, "success");
    assert.equal(result.output, "Curriculo enviado.");
    assert.deepEqual(toolArgs, [{ query: "andresimoes", mimeType: "application/pdf" }]);
  });

  it("accepts plan-shaped step decisions in loop mode", async () => {
    const decisions = [
      {
        steps: [
          {
            id: "search",
            toolName: "search_files",
            params: { query: "andresimoes", mimeType: "application/pdf" },
            reason: "Find resume.",
          },
        ],
      },
      { message: "Curriculo encontrado." },
    ];
    const toolArgs: unknown[] = [];

    const result = await runAgentLoop({
      userMessage: "Procure meu curriculo",
      contextMessages: [],
      model: loopModel(decisions),
      tools: [
        tool("search_files", async (args) => {
          toolArgs.push(args);
          return [{ id: "file_1" }];
        }),
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Curriculo encontrado.");
    assert.deepEqual(toolArgs, [{ query: "andresimoes", mimeType: "application/pdf" }]);
  });

  it("accepts OpenAI-style tool_calls decisions in loop mode", async () => {
    const decisions = [
      {
        tool_calls: [
          {
            function: {
              name: "send_email",
              arguments: JSON.stringify({ to: "vaurvik@gmail.com", subject: "Curriculo" }),
            },
          },
        ],
      },
      { final_answer: "Email enviado." },
    ];
    const toolArgs: unknown[] = [];

    const result = await runAgentLoop({
      userMessage: "Envie email",
      contextMessages: [],
      model: loopModel(decisions),
      tools: [
        tool("send_email", async (args) => {
          toolArgs.push(args);
          return { ok: true };
        }),
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Email enviado.");
    assert.deepEqual(toolArgs, [{ to: "vaurvik@gmail.com", subject: "Curriculo" }]);
  });

  it("retries plugin validation failures before moving to the next tool", async () => {
    const decisions = [
      { action: "tool", toolName: "list_files", params: { orderBy: "invalid" } },
      { action: "tool", toolName: "list_files", params: { orderBy: "name" } },
      { action: "tool", toolName: "download_file", params: { fileId: "file_1" } },
      { action: "final", response: "Arquivo baixado." },
    ];
    const calls: string[] = [];

    const result = await runAgentLoop({
      userMessage: "Baixe o arquivo",
      contextMessages: [],
      model: loopModel(decisions),
      tools: [
        tool("list_files", async (args) => {
          calls.push(`list:${(args as any).orderBy}`);
          if ((args as any).orderBy !== "name") {
            throw new AgentRuntimeError(
              "Validation failed for google-drive.listFiles",
              "AGENT_TOOL_ARGS_INVALID",
              "Validation failed for google-drive.listFiles",
              400,
            );
          }
          return [{ id: "file_1" }];
        }),
        tool("download_file", async (args) => {
          calls.push(`download:${(args as any).fileId}`);
          return { ok: true };
        }),
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Arquivo baixado.");
    assert.deepEqual(calls, ["list:invalid", "list:name", "download:file_1"]);
  });

  it("does not retry repairable tool errors when max retries per tool is zero", async () => {
    const decisions = [
      { action: "tool", toolName: "list_files", params: { orderBy: "invalid" } },
      { action: "tool", toolName: "list_files", params: { orderBy: "name" } },
    ];
    const calls: string[] = [];

    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Liste arquivos",
        contextMessages: [],
        maxRetriesPerTool: 0,
        model: loopModel(decisions),
        tools: [
          tool("list_files", async (args) => {
            calls.push(`list:${(args as any).orderBy}`);
            throw new AgentRuntimeError(
              "Validation failed",
              "AGENT_TOOL_ARGS_INVALID",
              "Validation failed",
              400,
            );
          }),
        ],
        emitEvent: () => {},
      }),
      /Validation failed/,
    );

    assert.deepEqual(calls, ["list:invalid"]);
  });

  it("retries loop decisions once when the model returns invalid JSON", async () => {
    let decisionCalls = 0;
    const prompts: string[] = [];

    const result = await runAgentLoop({
      userMessage: "Finalize",
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs final decision.", confidence: 0.9 };
        },
        async invokeJson(input) {
          decisionCalls += 1;
          prompts.push(input.messages.map((message) => message.content).join("\n"));
          if (decisionCalls === 1) {
            throw new AgentRuntimeError(
              "Ollama returned invalid JSON",
              "AGENT_MODEL_JSON_INVALID",
              "Model returned invalid JSON",
              502,
            );
          }
          return { action: "final", response: "Pronto." } as any;
        },
        async generateFinalResponse() {
          return "Pronto.";
        },
      },
      tools: [tool("noop", async () => ({ ok: true }))],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Pronto.");
    assert.equal(decisionCalls, 2);
    assert.match(prompts[1] ?? "", /Previous response was invalid JSON/);
  });

  it("falls back to the next required tool when repeated invalid JSON follows a useful tool result", async () => {
    let decisionCalls = 0;
    const calls: string[] = [];

    const result = await runAgentLoop({
      userMessage: "Download the report and send an email to user@example.com",
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
        },
        async invokeJson() {
          decisionCalls += 1;
          if (decisionCalls === 1) {
            return { action: "tool", toolName: "download_file", params: { fileId: "file_1" } } as any;
          }
          if (decisionCalls <= 3) {
            throw new AgentRuntimeError(
              "Ollama returned invalid JSON",
              "AGENT_MODEL_JSON_INVALID",
              "Model returned invalid JSON",
              502,
            );
          }
          return { action: "final", response: "Sent." } as any;
        },
        async generateFinalResponse() {
          return "Sent.";
        },
      },
      tools: [
        {
          ...tool("download_file", async () => {
            calls.push("download");
            return { download: { fileName: "report.pdf", mimeType: "application/pdf", content: Buffer.from("pdf") } };
          }),
          sideEffect: "read",
        },
        {
          ...tool("send_email", async (args) => {
            calls.push(`send:${(args as any).to}`);
            assert.equal((args as any).attachments[0].fileName, "report.pdf");
            return { sent: true };
          }),
          sideEffect: "external-message",
          requiresApproval: false,
          inputSchema: {
            type: "object",
            properties: {
              to: { type: "string", format: "email", "x-label": "To" },
              attachments: { type: "array", "x-label": "Attachments", "x-input-type": "file" },
            },
            required: ["to"],
          },
        },
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Sent.");
    assert.deepEqual(calls, ["download", "send:user@example.com"]);
  });

  it("retries file not found tool errors with new parameters", async () => {
    const decisions = [
      { action: "tool", toolName: "download_file", params: { fileId: "wrong_file." } },
      { action: "tool", toolName: "download_file", params: { fileId: "file_1" } },
      { action: "final", response: "Arquivo baixado." },
    ];
    const calls: string[] = [];

    const result = await runAgentLoop({
      userMessage: "Baixe o arquivo",
      contextMessages: [],
      model: loopModel(decisions),
      tools: [
        tool("download_file", async (args) => {
          const fileId = String((args as { fileId?: unknown }).fileId ?? "");
          calls.push(fileId);
          if (fileId !== "file_1") {
            throw new AgentRuntimeError(
              `Agent tool google_drive_download_file failed: File not found: ${fileId}`,
              "AGENT_TOOL_EXECUTION_FAILED",
              `Agent tool google_drive_download_file failed: File not found: ${fileId}`,
              502,
            );
          }
          return { ok: true };
        }),
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Arquivo baixado.");
    assert.deepEqual(calls, ["wrong_file.", "file_1"]);
  });

  it("does not execute the same successful tool call with identical params twice", async () => {
    const decisions = [
      { action: "tool", toolName: "download_file", params: { fileId: "file_1" } },
      { action: "tool", toolName: "download_file", params: { fileId: "file_1" } },
      { action: "final", response: "Arquivo baixado." },
    ];
    const prompts: string[] = [];
    let downloads = 0;

    const result = await runAgentLoop({
      userMessage: "Baixe o arquivo",
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
        },
        async invokeJson(input) {
          prompts.push(input.messages.map((message) => message.content).join("\n"));
          return decisions.shift() as any;
        },
        async generateFinalResponse() {
          return "Arquivo baixado.";
        },
      },
      tools: [
        tool("download_file", async () => {
          downloads += 1;
          return { ok: true, id: "file_1" };
        }),
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Arquivo baixado.");
    assert.equal(downloads, 1);
    assert.match(prompts[2] ?? "", /already succeeded with the same params/i);
  });

  it("does not execute the same successful tool call when only extra non-schema params changed", async () => {
    const decisions = [
      {
        action: "tool",
        toolName: "download_file",
        params: { fileId: "file_1", reason: "Download the selected file." },
      },
      { action: "tool", toolName: "download_file", params: { fileId: "file_1" } },
      { action: "final", response: "Arquivo baixado." },
    ];
    let downloads = 0;

    await runAgentLoop({
      userMessage: "Baixe o arquivo",
      contextMessages: [],
      model: loopModel(decisions),
      tools: [
        {
          ...tool("download_file", async () => {
            downloads += 1;
            return { ok: true };
          }),
          inputSchema: {
            type: "object",
            properties: { fileId: { type: "string" } },
            required: ["fileId"],
          },
        },
      ],
      emitEvent: () => {},
    });

    assert.equal(downloads, 1);
  });

  it("includes enum default and description in loop tool parameter summaries", async () => {
    const prompts: string[] = [];

    await runAgentLoop({
      userMessage: "Continue",
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
        },
        async invokeJson(input) {
          prompts.push(input.messages.map((message) => message.content).join("\n"));
          return { action: "final", response: "Done." } as any;
        },
        async generateFinalResponse() {
          return "Done.";
        },
      },
      tools: [
        {
          ...tool("list_files", async () => []),
          inputSchema: {
            type: "object",
            properties: {
              orderBy: {
                type: "string",
                description: "Sort order for the results.",
                default: "modifiedTime desc",
                enum: ["name", "modifiedTime desc", "createdTime desc", "size desc"],
                "x-label": "Order By",
                "x-input-type": "select",
              },
              content: { type: "string", format: "binary", "x-label": "Content" },
            },
          },
        },
      ],
      emitEvent: () => {},
    });

    assert.match(prompts[0] ?? "", /Sort order for the results\./);
    assert.match(prompts[0] ?? "", /modifiedTime desc/);
    assert.match(prompts[0] ?? "", /createdTime desc/);
    assert.match(prompts[0] ?? "", /size desc/);
    assert.match(prompts[0] ?? "", /Order By/);
    assert.match(prompts[0] ?? "", /select/);
    assert.match(prompts[0] ?? "", /binary/);
  });

  it("does not hide model provider failures after a successful tool result", async () => {
    let decisionCalls = 0;
    const calls: string[] = [];

    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Procure o arquivo backend e baixe",
        contextMessages: [],
        model: {
          async routeIntent() {
            return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
          },
          async invokeJson() {
            decisionCalls += 1;
            if (decisionCalls === 1) {
              return { action: "tool", toolName: "list_files", params: { query: "backend" } } as any;
            }
            throw new AgentRuntimeError(
              "Ollama API error: 500 Internal Server Error",
              "AGENT_MODEL_PROVIDER_ERROR",
              "Ollama model request failed",
              502,
            );
          },
          async generateFinalResponse() {
            return "Arquivo baixado.";
          },
        },
        tools: [
          {
            ...tool("list_files", async () => {
              calls.push("list");
              return [{ id: "file_1", name: "andresimoes-jr-backend.pdf" }];
            }),
            selection: { path: "$", labelFields: ["name"], valueField: "id", mode: "single" },
          },
          {
            ...tool("download_file", async (args) => {
              calls.push(`download:${(args as any).fileId}`);
              return { ok: true };
            }),
            inputSchema: {
              type: "object",
              required: ["fileId"],
              properties: { fileId: { type: "string" } },
            },
          },
        ],
        emitEvent: () => {},
      }),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MODEL_PROVIDER_ERROR",
    );

    assert.deepEqual(calls, ["list"]);
  });

  it("times out a stalled loop model decision after a successful tool result", async () => {
    let decisionCalls = 0;
    let secondDecisionSignal: AbortSignal | undefined;

    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Procure o arquivo, baixe e envie por email para vaurvik@gmail.com",
        contextMessages: [],
        modelCallTimeoutMs: 5,
        model: {
          async routeIntent() {
            return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
          },
          async invokeJson(input) {
            decisionCalls += 1;
            if (decisionCalls === 1) {
              return { action: "tool", toolName: "download_file", params: { fileId: "file_1" } } as any;
            }
            secondDecisionSignal = input.signal;
            return new Promise((_resolve, reject) => {
              input.signal?.addEventListener("abort", () => reject(new Error("aborted by signal")), { once: true });
              setTimeout(() => reject(new Error("missing loop decision timeout")), 25);
            }) as Promise<any>;
          },
          async generateFinalResponse() {
            return "Done.";
          },
        },
        tools: [
          {
            ...tool("download_file", async () => ({ ok: true })),
            inputSchema: {
              type: "object",
              properties: { fileId: { type: "string" } },
              required: ["fileId"],
            },
          },
          {
            ...tool("send_email", async () => ({ sent: true })),
            sideEffect: "external-message",
            requiresApproval: true,
          },
        ],
        emitEvent: () => {},
      }),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_LOOP_DECISION_TIMEOUT",
    );

    assert.equal(secondDecisionSignal?.aborted, true);
  });

  it("retries a timed out loop decision once after a successful tool result", async () => {
    let decisionCalls = 0;
    const calls: string[] = [];
    const prompts: string[] = [];

    const result = await runAgentLoop({
      userMessage: "Upload the video, then send another email with the posted video link.",
      contextMessages: [],
      modelCallTimeoutMs: 5,
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
        },
        async invokeJson(input) {
          decisionCalls += 1;
          prompts.push(input.messages.map((message) => message.content).join("\n"));
          if (decisionCalls === 1) {
            return { action: "tool", toolName: "upload_video", params: { file: { ref: "agent-file://video" } } } as any;
          }
          if (decisionCalls === 2) {
            return new Promise((_resolve, reject) => {
              input.signal?.addEventListener("abort", () => reject(new Error("aborted by signal")), { once: true });
              setTimeout(() => reject(new Error("missing loop decision timeout")), 25);
            }) as Promise<any>;
          }
          if (decisionCalls === 3) {
            return {
              action: "tool",
              toolName: "send_email",
              params: { to: "user@example.com", body: "https://youtube.example/video" },
            } as any;
          }
          return { action: "final", response: "Video uploaded and email sent." } as any;
        },
        async generateFinalResponse() {
          return "Done.";
        },
      },
      tools: [
        {
          ...tool("upload_video", async () => {
            calls.push("upload");
            return { url: "https://youtube.example/video" };
          }),
          sideEffect: "write",
        },
        {
          ...tool("send_email", async () => {
            calls.push("email");
            return { sent: true };
          }),
          sideEffect: "external-message",
        },
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Video uploaded and email sent.");
    assert.deepEqual(calls, ["upload", "email"]);
    assert.match(prompts[2] ?? "", /Previous loop decision timed out/i);
  });

  it("emits a failed tool step before retrying with a new tool call id", async () => {
    const decisions = [
      { action: "tool", toolName: "download_file", params: { fileId: "wrong_file." } },
      { action: "tool", toolName: "download_file", params: { fileId: "file_1" } },
      { action: "final", response: "Arquivo baixado." },
    ];
    const events: Array<{ type: string; payload?: Record<string, any> }> = [];

    await runAgentLoop({
      userMessage: "Baixe o arquivo",
      contextMessages: [],
      model: loopModel(decisions),
      tools: [
        tool("download_file", async (args) => {
          const fileId = String((args as { fileId?: unknown }).fileId ?? "");
          if (fileId !== "file_1") {
            throw new AgentRuntimeError(
              `Agent tool google_drive_download_file failed: File not found: ${fileId}`,
              "AGENT_TOOL_EXECUTION_FAILED",
              `Agent tool google_drive_download_file failed: File not found: ${fileId}`,
              502,
            );
          }
          return { ok: true };
        }),
      ],
      emitEvent: (event) => events.push(event as typeof events[number]),
    });

    const toolEvents = events.filter((event) => event.type.startsWith("agent:tool-"));
    assert.deepEqual(
      toolEvents.map((event) => [event.type, event.payload?.status, event.payload?.tool?.toolCallId]),
      [
        ["agent:tool-intent", "planned", "tool_call_1"],
        ["agent:tool-start", "running", "tool_call_1"],
        ["agent:tool-end", "failed", "tool_call_1"],
        ["agent:tool-retry", "retrying", "tool_call_1"],
        ["agent:tool-intent", "planned", "tool_call_2"],
        ["agent:tool-start", "running", "tool_call_2"],
        ["agent:tool-end", "success", "tool_call_2"],
      ],
    );
    assert.match(String(toolEvents[2]?.payload?.error), /File not found: wrong_file\./);
  });

  it("emits thinking progress while waiting for the next loop decision", async () => {
    const events: Array<{ type: string; payload?: Record<string, any> }> = [];

    await runAgentLoop({
      userMessage: "Download then upload the file",
      contextMessages: [],
      model: loopModel([
        { action: "tool", toolName: "download_file", params: { fileId: "file_1" } },
        { action: "tool", toolName: "upload_file", params: { fileId: "file_1" } },
        { action: "final", response: "Done." },
      ]),
      tools: [
        tool("download_file", async () => ({ ok: true })),
        tool("upload_file", async () => ({ ok: true })),
      ],
      emitEvent: (event) => events.push(event as typeof events[number]),
    });

    const types = events.map((event) => event.type);
    const firstToolEnd = types.indexOf("agent:tool-end");
    const secondThinking = types.indexOf("agent:thinking", firstToolEnd + 1);
    const secondToolIntent = types.indexOf("agent:tool-intent", firstToolEnd + 1);
    assert.ok(firstToolEnd >= 0);
    assert.ok(secondThinking > firstToolEnd);
    assert.ok(secondToolIntent > secondThinking);
    assert.equal(events[secondThinking]?.payload?.message, "Thinking");
  });

  it("executes an approved side-effect tool directly with the saved approval args", async () => {
    let invoked = 0;
    let decisionCalls = 0;
    const events: Array<{ type: string; payload?: Record<string, any> }> = [];

    const result = await runAgentLoop({
      userMessage: "Envie o email",
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs approved tool.", confidence: 0.9 };
        },
        async invokeJson() {
          decisionCalls += 1;
          return { action: "final", response: "Done without sending." } as any;
        },
        async generateFinalResponse() {
          return "Email enviado.";
        },
      },
      tools: [
        tool("google_gmail_send_message", async (args) => {
          invoked += 1;
          assert.deepEqual(args, {
            to: "vaurvik@gmail.com",
            subject: "Curriculo",
            attachment: { fileId: "file_1" },
          });
          return { sent: true, id: "gmail_1" };
        }),
      ],
      approvedTool: {
        toolName: "google_gmail_send_message",
        params: {
          to: "vaurvik@gmail.com",
          subject: "Curriculo",
          attachment: { fileId: "file_1" },
        },
      },
      emitEvent: (event) => events.push(event as typeof events[number]),
    });

    assert.equal(invoked, 1);
    assert.equal(decisionCalls, 0);
    assert.equal(result.toolCallCount, 1);
    assert.deepEqual(
      events.map((event) => [event.type, event.payload?.status, event.payload?.tool?.toolCallId]),
      [
        ["agent:tool-intent", "planned", "tool_call_1"],
        ["agent:tool-start", "running", "tool_call_1"],
        ["agent:tool-end", "success", "tool_call_1"],
      ],
    );
  });

  it("does not emit running progress for approval tools before the user approves", async () => {
    const events: Array<{ type: string; payload?: Record<string, any> }> = [];

    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Send an email",
        contextMessages: [],
        model: loopModel([
          { action: "tool", toolName: "send_email", params: { to: "user@example.com" } },
        ]),
        tools: [
          {
            ...tool("send_email", async (args) => {
              throw new AgentToolApprovalRequiredError({
                toolName: "send_email",
                sideEffect: "external-message",
                args: args as Record<string, unknown>,
              });
            }),
            sideEffect: "external-message",
            requiresApproval: true,
          },
        ],
        emitEvent: (event) => events.push(event as any),
      }),
      AgentToolApprovalRequiredError,
    );

    assert.deepEqual(
      events
        .filter((event) => event.type.startsWith("agent:tool-"))
        .map((event) => [event.type, event.payload?.status]),
      [["agent:tool-intent", "planned"]],
    );
  });

  it("continues the loop after approving a side-effect tool that is not the final requested step", async () => {
    const calls: string[] = [];
    let firstApprovalRequest: AgentToolApprovalRequiredError["approvalRequest"] | null = null;
    let finalApprovalStage = "";
    let noticeApprovalRequested = false;

    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Download the video, send a notice email, upload it, then send the video link by email",
        contextMessages: [],
        model: loopModel([
          { action: "tool", toolName: "download_file", params: { fileId: "video_1" } },
          { action: "tool", toolName: "send_email", params: { stage: "notice", to: "user@example.com" } },
        ]),
        tools: [
          tool("download_file", async () => {
            calls.push("download");
            return { file: { ref: "agent-file://video" } };
          }),
          {
            ...tool("send_email", async (args) => {
              const stage = String((args as any).stage);
              calls.push(`send:${stage}`);
              if (stage === "notice" && !noticeApprovalRequested) {
                noticeApprovalRequested = true;
                throw new AgentToolApprovalRequiredError({
                  toolName: "send_email",
                  sideEffect: "external-message",
                  args: args as Record<string, unknown>,
                });
              }
              if (stage === "final") {
                throw new AgentToolApprovalRequiredError({
                  toolName: "send_email",
                  sideEffect: "external-message",
                  args: args as Record<string, unknown>,
                });
              }
              return { sent: true, stage };
            }),
            sideEffect: "external-message",
            requiresApproval: true,
          },
          tool("upload_video", async () => {
            calls.push("upload");
            return { url: "https://youtube.example/video" };
          }),
        ],
        emitEvent: () => {},
      }),
      (error) => {
        firstApprovalRequest = error instanceof AgentToolApprovalRequiredError ? error.approvalRequest : null;
        return Boolean(firstApprovalRequest);
      },
    );

    const resumeState = (firstApprovalRequest as any)?.resumeState;
    assert.ok(resumeState, "first approval should include loop resume state");

    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Download the video, send a notice email, upload it, then send the video link by email",
        contextMessages: [],
        model: loopModel([
          { action: "tool", toolName: "upload_video", params: { file: { ref: "agent-file://video" } } },
          {
            action: "tool",
            toolName: "send_email",
            params: { stage: "final", to: "user@example.com", body: "https://youtube.example/video" },
          },
        ]),
        approvedTool: {
          toolName: "send_email",
          params: firstApprovalRequest!.args,
          resumeState,
        },
        tools: [
          tool("download_file", async () => {
            calls.push("download-again");
            return {};
          }),
          {
            ...tool("send_email", async (args) => {
              const stage = String((args as any).stage);
              calls.push(`send:${stage}`);
              if (stage === "final") {
                throw new AgentToolApprovalRequiredError({
                  toolName: "send_email",
                  sideEffect: "external-message",
                  args: args as Record<string, unknown>,
                });
              }
              return { sent: true, stage };
            }),
            sideEffect: "external-message",
            requiresApproval: true,
          },
          tool("upload_video", async () => {
            calls.push("upload");
            return { url: "https://youtube.example/video" };
          }),
        ],
        emitEvent: () => {},
      }),
      (error) => {
        finalApprovalStage = error instanceof AgentToolApprovalRequiredError
          ? String(error.approvalRequest.args.stage ?? "")
          : "";
        return Boolean(finalApprovalStage);
      },
    );

    assert.deepEqual(calls, ["download", "send:notice", "send:notice", "upload", "send:final"]);
    assert.equal(finalApprovalStage, "final");
  });

  it("requires repeated side-effect tool executions when the request asks twice for the same action", async () => {
    const decisions = [
      { action: "tool", toolName: "download_file", params: { fileId: "video_1" } },
      { action: "tool", toolName: "send_email", params: { stage: "notice" } },
      { action: "tool", toolName: "upload_video", params: { file: { ref: "agent-file://video" } } },
      { action: "final", response: "Video posted." },
      { action: "tool", toolName: "send_email", params: { stage: "final", body: "https://youtube.example/video" } },
      { action: "final", response: "Video posted and final email sent." },
    ];
    const calls: string[] = [];
    const prompts: string[] = [];

    const result = await runAgentLoop({
      userMessage: [
        "Download the video from Drive,",
        "send an email warning the user to wait,",
        "upload the video to YouTube,",
        "then send another email with the posted video link.",
      ].join(" "),
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
        },
        async invokeJson(input) {
          prompts.push(input.messages.map((message) => message.content).join("\n"));
          return decisions.shift() as any;
        },
        async generateFinalResponse() {
          return "Done.";
        },
      },
      tools: [
        {
          ...tool("download_file", async () => {
            calls.push("download");
            return { file: { ref: "agent-file://video" } };
          }),
          sideEffect: "read",
        },
        {
          ...tool("send_email", async (args) => {
            calls.push(`email:${String((args as any).stage)}`);
            return { sent: true };
          }),
          sideEffect: "external-message",
          requiresApproval: false,
        },
        {
          ...tool("upload_video", async () => {
            calls.push("upload");
            return { url: "https://youtube.example/video" };
          }),
          sideEffect: "write",
        },
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Video posted and final email sent.");
    assert.deepEqual(calls, ["download", "email:notice", "upload", "email:final"]);
    assert.match(prompts[4] ?? "", /Still need to use: send_email/i);
  });

  it("does not replay a completed read tool after approval when a pending side-effect can use its result", async () => {
    const calls: string[] = [];
    let firstApprovalRequest: AgentToolApprovalRequiredError["approvalRequest"] | null = null;

    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Download the video, send a notice email, upload the video, then send the link",
        contextMessages: [],
        model: loopModel([
          { action: "tool", toolName: "download_video", params: { fileId: "video_1" } },
          { action: "tool", toolName: "send_email", params: { stage: "notice" } },
        ]),
        tools: [
          {
            ...tool("download_video", async () => {
              calls.push("download");
              return { file: { ref: "agent-file://video" } };
            }),
            sideEffect: "read",
          },
          {
            ...tool("send_email", async (args) => {
              calls.push(`email:${String((args as any).stage)}`);
              throw new AgentToolApprovalRequiredError({
                toolName: "send_email",
                sideEffect: "external-message",
                args: args as Record<string, unknown>,
              });
            }),
            sideEffect: "external-message",
            requiresApproval: true,
          },
          {
            ...tool("upload_video", async () => {
              calls.push("upload");
              return { url: "https://youtube.example/video" };
            }),
            sideEffect: "write",
          },
        ],
        emitEvent: () => {},
      }),
      (error) => {
        firstApprovalRequest = error instanceof AgentToolApprovalRequiredError ? error.approvalRequest : null;
        return Boolean(firstApprovalRequest);
      },
    );

    const prompts: string[] = [];
    const result = await runAgentLoop({
      userMessage: "Download the video, send a notice email, upload the video, then send the link",
      contextMessages: [],
      approvedTool: {
        toolName: "send_email",
        params: firstApprovalRequest!.args,
        resumeState: (firstApprovalRequest as any).resumeState,
      },
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
        },
        async invokeJson(input) {
          prompts.push(input.messages.map((message) => message.content).join("\n"));
          if (prompts.length === 1) {
            return {
              action: "tool",
              toolName: "download_video",
              params: { fileId: "video_1", reason: "Download the video again before upload." },
            } as any;
          }
          if (prompts.length === 2) {
            return { action: "tool", toolName: "upload_video", params: { file: { ref: "agent-file://video" } } } as any;
          }
          return { action: "final", response: "Uploaded." } as any;
        },
        async generateFinalResponse() {
          return "Uploaded.";
        },
      },
      tools: [
        {
          ...tool("download_video", async () => {
            calls.push("download-again");
            return { file: { ref: "agent-file://video-again" } };
          }),
          sideEffect: "read",
        },
        {
          ...tool("send_email", async (args) => {
            calls.push(`email:${String((args as any).stage)}`);
            return { sent: true };
          }),
          sideEffect: "external-message",
          requiresApproval: true,
        },
        {
          ...tool("upload_video", async () => {
            calls.push("upload");
            return { url: "https://youtube.example/video" };
          }),
          sideEffect: "write",
        },
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Uploaded.");
    assert.deepEqual(calls, ["download", "email:notice", "email:notice", "upload"]);
    assert.match(prompts[1] ?? "", /already completed/i);
    assert.match(prompts[1] ?? "", /use the previous tool result/i);
  });

  it("does not accept a final answer before requested tools are completed", async () => {
    const decisions = [
      { action: "tool", toolName: "google_drive_list_files", params: { q: "andresimoes" } },
      { action: "final", response: "Email sent with the curriculum PDF to vaurvik@gmail.com" },
      { action: "tool", toolName: "google_drive_download_file", params: { fileId: "file_1" } },
      {
        action: "tool",
        toolName: "google_gmail_send_message",
        params: {
          to: "vaurvik@gmail.com",
          attachments: [{ ref: "agent-file://will-be-filled-by-model" }],
        },
      },
      { action: "final", response: "Email enviado." },
    ];
    const calls: string[] = [];
    const prompts: string[] = [];

    const result = await runAgentLoop({
      userMessage: "Procure pelo meu curriculo pdf chamado andresimoes no drive e depois baixe e envie por email para vaurvik@gmail.com",
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
        },
        async invokeJson(input) {
          prompts.push(input.messages.map((message) => message.content).join("\n"));
          return decisions.shift() as any;
        },
        async generateFinalResponse() {
          return "Email enviado.";
        },
      },
      tools: [
        tool("google_drive_list_files", async () => {
          calls.push("list");
          return { files: [{ id: "file_1", name: "andresimoes.pdf" }] };
        }),
        tool("google_drive_download_file", async () => {
          calls.push("download");
          return { download: { fileName: "andresimoes.pdf", mimeType: "application/pdf", content: Buffer.from("pdf") } };
        }),
        {
          ...tool("google_gmail_send_message", async () => {
            calls.push("send");
            return { sent: true };
          }),
          sideEffect: "external-message",
          requiresApproval: true,
        },
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Email enviado.");
    assert.deepEqual(calls, ["list", "download", "send"]);
    assert.match(prompts[2] ?? "", /not complete/i);
    assert.match(prompts[2] ?? "", /google_gmail_send_message/);
  });

  it("passes cached file refs from one tool result into the next tool args", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-loop-files-"));
    let ref = "";
    let sent = false;
    const sendArgs: any[] = [];

    const result = await runAgentLoop({
      userMessage: "Download the report and send it",
      contextMessages: [],
      model: {
        async routeIntent() {
          return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
        },
        async invokeJson(input) {
          const prompt = input.messages.map((message) => message.content).join("\n");
          const match = prompt.match(/agent-file:\/\/[a-f0-9-]+/i);
          if (sent) return { action: "final", response: "Sent." } as any;
          if (!ref && !match) return { action: "tool", toolName: "download_file", params: { fileId: "file_1" } } as any;
          ref = match?.[0] ?? ref;
          if (ref) return { action: "tool", toolName: "send_file", params: { attachments: [{ ref }] } } as any;
          return { action: "final", response: "Done." } as any;
        },
        async generateFinalResponse() {
          return "Sent.";
        },
      },
      fileRefStore: new AgentFileRefStore({ rootDir: root }),
      tools: [
        tool("download_file", async () => ({
          download: { fileName: "report.pdf", mimeType: "application/pdf", content: Buffer.from("pdf") },
        })),
        {
          ...tool("send_file", async (args) => {
            sendArgs.push(args);
            sent = true;
            return { sent: true };
          }),
          sideEffect: "external-message",
          requiresApproval: false,
        },
      ],
      emitEvent: () => {},
    });

    assert.equal(result.output, "Sent.");
    assert.equal(sendArgs[0].attachments[0].filename, "report.pdf");
    assert.equal(sendArgs[0].attachments[0].mimeType, "application/pdf");
    assert.equal(typeof sendArgs[0].attachments[0].content.pipe, "function");
  });

  it("keeps file refs unresolved in approval requests and resolves them after approval", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-loop-approval-files-"));
    const store = new AgentFileRefStore({ rootDir: root });
    const ref = await store.put({
      toolCallId: "tool_call_download",
      path: "download/content",
      fileName: "andresimoes.pdf",
      mimeType: "application/pdf",
      value: Buffer.from("pdf"),
    });
    let approvalArgs: any;
    let approvedArgs: any;

    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Send the downloaded file",
        contextMessages: [],
        model: loopModel([
          { action: "tool", toolName: "send_file", params: { attachments: [ref] } },
        ]),
        fileRefStore: store,
        tools: [
          {
            ...tool("send_file", async (args) => {
              approvalArgs = args;
              throw new AgentToolApprovalRequiredError({
                toolName: "send_file",
                sideEffect: "external-message",
                args: args as Record<string, unknown>,
              });
            }),
            sideEffect: "external-message",
            requiresApproval: true,
          },
        ],
        emitEvent: () => {},
      }),
      AgentToolApprovalRequiredError,
    );

    assert.equal(approvalArgs.attachments[0].ref, ref.ref);
    assert.notEqual(approvalArgs.attachments[0].content?.type, "Readable");

    await runAgentLoop({
      userMessage: "Send the downloaded file",
      contextMessages: [],
      model: loopModel([]),
      fileRefStore: store,
      approvedTool: {
        toolName: "send_file",
        params: { attachments: [ref] },
      },
      tools: [
        {
          ...tool("send_file", async (args) => {
            approvedArgs = args;
            return { sent: true };
          }),
          sideEffect: "external-message",
          requiresApproval: true,
        },
      ],
      emitEvent: () => {},
    });

    assert.equal(approvedArgs.attachments[0].filename, "andresimoes.pdf");
    assert.equal(approvedArgs.attachments[0].mimeType, "application/pdf");
    assert.equal(typeof approvedArgs.attachments[0].content.pipe, "function");
  });

  it("rejects approval params that ignore an available file ref before requesting approval", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-loop-approval-ref-guard-"));
    const prompts: string[] = [];
    let ref = "";
    let approvalArgs: any;
    const decisions: unknown[] = [
      { action: "tool", toolName: "download_file", params: { fileId: "drive_file_1" } },
      {
        action: "tool",
        toolName: "send_file",
        params: {
          to: "vaurvik@gmail.com",
          attachments: [{ fileId: "drive_file_1", mimeType: "application/pdf" }],
        },
      },
      () => ({
        action: "tool",
        toolName: "send_file",
        params: {
          to: "vaurvik@gmail.com",
          attachments: [{ ref }],
        },
      }),
    ];

    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Download the report and send it by email",
        contextMessages: [],
        fileRefStore: new AgentFileRefStore({ rootDir: root }),
        model: {
          async routeIntent() {
            return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
          },
          async invokeJson(input) {
            const prompt = input.messages.map((message) => message.content).join("\n");
            prompts.push(prompt);
            ref = prompt.match(/agent-file:\/\/[a-f0-9-]+/i)?.[0] ?? ref;
            const decision = decisions.shift();
            return typeof decision === "function" ? (decision as () => unknown)() as any : decision as any;
          },
          async generateFinalResponse() {
            return "Done.";
          },
        },
        tools: [
          tool("download_file", async () => ({
            download: { fileName: "report.pdf", mimeType: "application/pdf", content: Buffer.from("pdf") },
          })),
          {
            ...tool("send_file", async (args) => {
              approvalArgs = args;
              throw new AgentToolApprovalRequiredError({
                toolName: "send_file",
                sideEffect: "external-message",
                args: args as Record<string, unknown>,
              });
            }),
            sideEffect: "external-message",
            requiresApproval: true,
            inputSchema: {
              type: "object",
              properties: {
                to: { type: "string" },
                attachments: { type: "array" },
              },
            },
          },
        ],
        emitEvent: () => {},
      }),
      AgentToolApprovalRequiredError,
    );

    assert.equal(approvalArgs.attachments[0].ref, ref);
    assert.match(prompts[2] ?? "", /already downloaded file/i);
    assert.match(prompts[2] ?? "", /agent-file:\/\//i);
  });

  it("fails clearly when the model insists on finalizing with required tools still pending", async () => {
    await assert.rejects(
      () => runAgentLoop({
        userMessage: "Send an email to vaurvik@gmail.com",
        contextMessages: [],
        maxIterations: 2,
        model: loopModel([
          { action: "final", response: "Email sent." },
          { action: "final", response: "Email sent." },
        ]),
        tools: [
          {
            ...tool("send_email", async () => ({ sent: true })),
            sideEffect: "external-message",
            requiresApproval: true,
          },
        ],
        emitEvent: () => {},
      }),
      /required tools/i,
    );
  });
});

function loopModel(decisions: unknown[]) {
  return {
    async routeIntent() {
      return { mode: "tool_plan", reason: "Needs tools.", confidence: 0.9 };
    },
    async invokeJson() {
      return decisions.shift() as any;
    },
    async generateFinalResponse() {
      return "Done.";
    },
  };
}

function tool(name: string, invoke: AgentPlanTool["invoke"]): AgentPlanTool {
  return {
    name,
    description: name,
    requiresApproval: false,
    inputSchema: { type: "object" },
    timeoutMs: 30000,
    invoke,
  };
}
