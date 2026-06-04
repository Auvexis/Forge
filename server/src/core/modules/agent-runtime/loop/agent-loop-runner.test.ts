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
});

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
