import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "../agent-errors.ts";
import { runAgentLoop } from "./agent-loop-runner.ts";
import type { AgentPlanTool } from "../plan/agent-plan-types.ts";

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
