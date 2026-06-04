import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "../agent-errors.ts";
import { generateAgentPlan, type AgentPlanModel } from "./agent-plan-generator.ts";
import type { AgentPlanTool } from "./agent-plan-types.ts";

describe("agent plan generator", () => {
  it("calls the model once to generate a complete validated plan", async () => {
    const prompts: string[] = [];
    const savedMessages: string[] = [];
    const model: AgentPlanModel = {
      generatePlan: async (input) => {
        prompts.push(input.messages.map((message) => message.content).join("\n"));
        return {
          steps: [
            {
              id: "search",
              toolName: "google_drive_list_files",
              params: { query: "andresimoes" },
              reason: "Find the requested file.",
            },
            {
              id: "download",
              toolName: "google_drive_download_file",
              params: { fileId: "$steps.search[0].id" },
              reason: "Download selected file.",
            },
            {
              id: "send",
              toolName: "google_gmail_send_message",
              params: { to: "vaurvik@gmail.com", attachments: ["$steps.download.download"] },
              reason: "Send the file by email.",
            },
          ],
        };
      },
    };

    const plan = await generateAgentPlan({
      model,
      userMessage: "Send my CV to vaurvik@gmail.com",
      tools: [
        tool("google_drive_list_files", "List Drive files", { query: { type: "string" } }),
        tool("google_drive_download_file", "Download a Drive file", { fileId: { type: "string" } }),
        tool("google_gmail_send_message", "Send a Gmail message", { to: { type: "string" } }),
      ],
      saveMessage: (message) => {
        savedMessages.push(message);
      },
    });

    assert.equal(prompts.length, 1);
    assert.deepEqual(plan.steps.map((step) => step.toolName), [
      "google_drive_list_files",
      "google_drive_download_file",
      "google_gmail_send_message",
    ]);
    assert.deepEqual(savedMessages, [
      "Thinking",
      "Generating Plan",
      "Choosing the best tools",
    ]);
    assert.match(prompts[0], /google_drive_list_files/);
    assert.match(prompts[0], /\$steps\.<stepId>\[0\]\.<field>/);
  });

  it("rejects plans with unavailable tools before execution", async () => {
    await assert.rejects(
      () => generateAgentPlan({
        model: {
          generatePlan: async () => ({
            steps: [{ id: "search", toolName: "missing_tool", params: {}, reason: "Search." }],
          }),
        },
        userMessage: "Search files",
        tools: [tool("google_drive_list_files")],
      }),
      (error) => error instanceof AgentRuntimeError &&
        error.code === "AGENT_PLAN_TOOL_UNKNOWN",
    );
  });

  it("rejects empty plans when tools are available for the request", async () => {
    await assert.rejects(
      () => generateAgentPlan({
        model: { generatePlan: async () => ({ steps: [] }) },
        userMessage: "Search files",
        tools: [tool("google_drive_list_files")],
      }),
      (error) => error instanceof AgentRuntimeError &&
        error.code === "AGENT_PLAN_EMPTY",
    );
  });
});

function tool(
  name: string,
  description = name,
  properties: Record<string, unknown> = {},
): AgentPlanTool {
  return {
    name,
    description,
    pluginId: "plugin",
    methodId: name,
    inputSchema: { type: "object", properties },
    requiresApproval: false,
    sideEffect: "read",
    timeoutMs: 30000,
    invoke: async () => ({}),
  };
}
