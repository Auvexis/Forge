import { describe, expect, it } from "vitest";
import type {
  AgentActionRecord,
  AgentArtifactRef,
  AgentMcpError,
  AgentPendingInteraction,
  AgentToolCallRecord,
} from "./agent-domain-contracts.ts";

describe("agent domain contracts", () => {
  it("correlates actions, calls, interactions, artifacts, and errors", () => {
    const action: AgentActionRecord = {
      id: "action_1",
      runId: "run_1",
      toolName: "drive_download",
      objective: "Download X.mp4",
      dependsOn: [],
      state: "running",
      version: 1,
    };
    const error: AgentMcpError = {
      code: "AUTH_EXPIRED",
      category: "authentication",
      message: "Reconnect Drive",
      retryable: false,
      userActionRequired: true,
    };
    const call: AgentToolCallRecord = {
      id: "call_1",
      runId: action.runId,
      actionId: action.id,
      toolName: action.toolName,
      arguments: {},
      status: "failed",
      error,
    };
    const interaction: AgentPendingInteraction = {
      id: "interaction_1",
      runId: action.runId,
      actionId: action.id,
      kind: "authentication",
      question: "Reconectar o Drive?",
      context: {},
      status: "pending",
    };
    const artifact: AgentArtifactRef = {
      ref: "artifact://video_1",
      profileId: "profile_1",
      name: "X.mp4",
      mimeType: "video/mp4",
      size: 10,
    };

    expect(call.error?.category).toBe("authentication");
    expect(interaction.runId).toBe(action.runId);
    expect(artifact.ref).toMatch(/^artifact:\/\//);
  });
});
