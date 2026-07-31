import { describe, expect, it } from "vitest";
import type { AgentMcpError } from "../contracts/agent-domain-contracts.ts";
import {
  advanceResumableMcpAgentLoop,
  createResumableMcpLoopState,
} from "../loop/resumable-mcp-agent-loop.ts";
import { routePendingInteractionReply } from "./pending-interaction-router.ts";

describe("durable resumable interactions", () => {
  it.each([
    ["policy", "AGENT_TOOL_APPROVAL_REQUIRED", "approval"],
    ["ambiguous", "AGENT_MULTIPLE_MATCHES", "selection"],
    ["authentication", "AGENT_OAUTH_REQUIRED", "authentication"],
    ["permission", "AGENT_PERMISSION_REQUIRED", "permission"],
    ["validation", "AGENT_VALUE_REQUIRED", "clarification"],
  ] as const)("maps %s tool failures to %s interactions", async (category, code, kind) => {
    const requested = await requestTool();
    if (requested.type !== "request") throw new Error("Expected tool request");
    const error: AgentMcpError = {
      category,
      code,
      message: "User action is required",
      retryable: false,
      userActionRequired: true,
      ...(kind === "selection"
        ? { details: { options: [{ value: "file_1", label: "backend.pdf" }] } }
        : {}),
    };
    const resumed = await advanceResumableMcpAgentLoop({
      ...loopInput([]),
      state: requested.state,
      response: {
        id: "response_1",
        requestId: requested.request.id,
        runId: "run_1",
        toolCallId: requested.request.toolCallId,
        status: "failed",
        error,
        createdAt: new Date().toISOString(),
      },
    });
    expect(resumed).toMatchObject({
      type: "interaction",
      kind,
      context: {
        source: "tool-error",
        requestId: requested.request.id,
      },
    });
    if (kind === "selection") {
      expect(resumed).toMatchObject({
        options: [{ value: "file_1", label: "backend.pdf" }],
      });
    }
  });

  it("routes explicit rejection as feedback instead of a cancel command", () => {
    expect(routePendingInteractionReply({
      id: "interaction_1",
      runId: "run_1",
      kind: "approval",
      question: "Approve?",
      context: {},
      status: "pending",
    }, "não")).toEqual({ type: "confirm", confirmed: false });
  });
});

async function requestTool() {
  return advanceResumableMcpAgentLoop(loopInput([
    { mode: "tool", toolName: "drive_list", objective: "Find file" },
    { action: "call", arguments: { query: "backend" } },
  ]));
}

function loopInput(decisions: unknown[]) {
  return {
    runId: "run_1",
    model: { invokeJson: async () => decisions.shift() as any },
    client: {
      listTools: () => [{ name: "drive_list", summary: "List files", sideEffect: "read" }],
      describeTool: () => ({
        name: "drive_list",
        summary: "List files",
        sideEffect: "read",
        requiresApproval: false,
        timeoutMs: 30_000,
        inputSchema: {
          type: "object",
          required: ["query"],
          properties: { query: { type: "string" } },
        },
      }),
      validateToolArguments: () => undefined,
    } as any,
    systemPrompt: "",
    userMessage: "Find backend CV",
    contextMessages: [],
    state: createResumableMcpLoopState(),
    maxIterations: 8,
    maxToolCalls: 4,
  };
}
