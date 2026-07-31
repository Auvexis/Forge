import { describe, expect, it } from "vitest";
import type { AgentEngineRequest } from "./agent-engine-request.ts";
import type { AgentEngineResponse } from "./agent-engine-response.ts";
import type { AgentInteractionRequest } from "./agent-interaction-contract.ts";
import {
  isAgentProviderContinuationMetadata,
} from "./agent-provider-metadata.ts";
import {
  AGENT_ENGINE_PROTOCOL_VERSION,
  type AgentRunContract,
} from "./agent-run-contract.ts";

describe("agent engine protocol contracts", () => {
  it("correlates a durable request and response without positional state", () => {
    const request: AgentEngineRequest = {
      kind: "tool",
      id: "request_1",
      idempotencyKey: "run_1:call_1",
      runId: "run_1",
      iteration: 1,
      toolCallId: "call_1",
      actionId: "action_1",
      toolName: "drive_list",
      arguments: { query: "backend" },
      status: "queued",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };
    const response: AgentEngineResponse = {
      id: "response_1",
      requestId: request.id,
      runId: request.runId,
      toolCallId: request.toolCallId,
      status: "succeeded",
      output: [],
      createdAt: "2026-07-30T00:00:01.000Z",
    };

    expect(response).toMatchObject({
      requestId: "request_1",
      runId: "run_1",
      toolCallId: "call_1",
    });
  });

  it("keeps protocol state and user interaction explicitly typed", () => {
    const run: AgentRunContract = {
      protocolVersion: AGENT_ENGINE_PROTOCOL_VERSION,
      runId: "run_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      status: "waiting-interaction",
      iterationCount: 2,
      toolCallCount: 1,
      stopReason: "interaction-required",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:01.000Z",
    };
    const interaction: AgentInteractionRequest = {
      id: "interaction_1",
      runId: run.runId,
      kind: "clarification",
      question: "Qual é o nome do arquivo?",
      context: {},
      status: "pending",
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };

    expect(run.protocolVersion).toBe(1);
    expect(interaction.status).toBe("pending");
  });

  it("accepts only versioned provider metadata envelopes", () => {
    expect(isAgentProviderContinuationMetadata({
      provider: "ollama",
      formatVersion: 1,
      payload: {},
    })).toBe(true);
    expect(isAgentProviderContinuationMetadata({
      provider: "ollama",
      payload: {},
    })).toBe(false);
  });
});
