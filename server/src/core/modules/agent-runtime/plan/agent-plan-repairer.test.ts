import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "../agent-errors.ts";
import {
  createAgentPlanRepairer,
  isRepairableAgentPlanError,
  type AgentPlanRepairModel,
} from "./agent-plan-repairer.ts";
import type { AgentPlan, AgentPlanTool } from "./agent-plan-types.ts";

describe("agent plan repairer", () => {
  it("returns only a params patch for repairable parameter errors", async () => {
    const savedMessages: string[] = [];
    const calls: string[] = [];
    const model: AgentPlanRepairModel = {
      repairPlanStep: async (input) => {
        calls.push(JSON.stringify(input));
        return { params: { fileId: "file_1" } };
      },
    };
    const repairer = createAgentPlanRepairer({ model, saveMessage: (message) => savedMessages.push(message) });

    const repair = await repairer.repairStep({
      plan: plan(),
      step: plan().steps[1],
      error: new AgentRuntimeError("fileId required", "AGENT_TOOL_ARGS_INVALID", "Invalid params", 400),
      outputs: { search: [{ id: "file_1", name: "CV.pdf" }] },
      tool: tool("download", { fileId: { type: "string" } }),
    });

    assert.deepEqual(repair, { params: { fileId: "file_1" } });
    assert.equal(calls.length, 1);
    assert.deepEqual(savedMessages, ["Analyzing errors", "Creating new parameters"]);
    assert.match(calls[0], /AGENT_TOOL_ARGS_INVALID/);
    assert.match(calls[0], /fileId/);
  });

  it("does not call the model for non repairable errors", async () => {
    const nonRepairable = [
      new AgentRuntimeError("auth", "AGENT_TOOL_AUTH_REQUIRED", "Auth required", 401),
      new AgentRuntimeError("permission", "AGENT_TOOL_PERMISSION_DENIED", "Permission denied", 403),
      new AgentToolApprovalRequiredError({ toolName: "send", sideEffect: "write", args: {} }),
      new AgentRuntimeError("not found", "AGENT_TOOL_NOT_FOUND", "Not found", 404),
    ];

    for (const error of nonRepairable) {
      assert.equal(isRepairableAgentPlanError(error), false);
    }
  });

  it("limits repair to one call per step", async () => {
    let calls = 0;
    const repairer = createAgentPlanRepairer({
      model: {
        repairPlanStep: async () => {
          calls += 1;
          return { params: { fileId: "file_1" } };
        },
      },
    });
    const input = {
      plan: plan(),
      step: plan().steps[1],
      error: new AgentRuntimeError("missing", "AGENT_TOOL_REF_UNRESOLVED", "Missing value", 400),
      outputs: {},
      tool: tool("download"),
    };

    assert.deepEqual(await repairer.repairStep(input), { params: { fileId: "file_1" } });
    assert.equal(await repairer.repairStep(input), null);
    assert.equal(calls, 1);
  });
});

function plan(): AgentPlan {
  return {
    steps: [
      { id: "search", toolName: "search", params: { query: "CV" }, reason: "Search file." },
      { id: "download", toolName: "download", params: { fileId: "$steps.search[0].id" }, reason: "Download file." },
    ],
  };
}

function tool(name: string, properties: Record<string, unknown> = {}): AgentPlanTool {
  return {
    name,
    description: name,
    pluginId: "plugin",
    methodId: name,
    inputSchema: { type: "object", properties },
    requiresApproval: false,
    sideEffect: "read",
    timeoutMs: 30000,
    invoke: async () => ({}),
  };
}
