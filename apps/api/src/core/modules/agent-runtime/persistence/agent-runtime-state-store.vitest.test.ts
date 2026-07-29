import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { up } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import type { AgentRunInput } from "../agent-types.ts";
import { AgentActionRepository } from "./agent-action-repository.ts";
import { AgentRunRepository } from "./agent-run-repository.ts";
import { AgentRuntimeStateStore } from "./agent-runtime-state-store.ts";

describe("AgentRuntimeStateStore", () => {
  it("persists run and action transitions", async () => {
    const db = new Database(":memory:");
    await up(db);
    const store = new AgentRuntimeStateStore(db);
    store.startRun("run_1", runInput());
    store.markRunRunning();
    store.initializeActions([{
      id: "action_1",
      toolName: "drive_download",
      objective: "Download the file",
      dependsOn: [],
    }]);
    store.markActionRunning("action_1");
    store.markActionCompleted("action_1", { artifact: "artifact://file_1" });
    store.markRunCompleted();

    expect(new AgentRunRepository(db).getById("profile_1", "run_1")).toMatchObject({
      state: "completed",
      version: 3,
    });
    expect(new AgentActionRepository(db).getById("run_1", "action_1")).toMatchObject({
      state: "completed",
      output: { artifact: "artifact://file_1" },
      version: 4,
    });
  });
});

function runInput(): AgentRunInput {
  return {
    profileId: "profile_1",
    workflowId: "workflow_1",
    executionId: "execution_1",
    nodeId: "agent_1",
    sessionId: "session_1",
    userMessage: "download the file",
    triggerPayload: {},
    agent: {
      type: "ai-agent",
      name: "Agent",
      prompt: "Help",
      executionMode: "loop",
      maxIterations: 10,
      maxToolCalls: 10,
      maxRetriesPerTool: 1,
      timeoutMs: 30_000,
      requireApprovalForSideEffects: [],
      outputMode: "text",
    },
    model: {
      type: "ai-model",
      name: "Model",
      pluginId: "model",
      adapter: "openai-compatible",
      model: "test",
      temperature: 0,
    },
    tools: [],
  };
}
