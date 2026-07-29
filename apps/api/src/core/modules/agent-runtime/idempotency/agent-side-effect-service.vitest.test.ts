import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createSideEffects } from "../../../database/migrations/workflows/010_agent_side_effects.ts";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "../mcp/internal-mcp-server.ts";
import { AgentRunRepository } from "../persistence/agent-run-repository.ts";
import { AgentSideEffectRepository } from "./agent-side-effect-repository.ts";
import { AgentSideEffectService } from "./agent-side-effect-service.ts";

describe("AgentSideEffectService", () => {
  it("replays a duplicate delivery after the service is recreated", async () => {
    const db = await database();
    let deliveries = 0;
    const createClient = () => {
      const service = new AgentSideEffectService(new AgentSideEffectRepository(db));
      return new InternalMcpClient(new InternalMcpServer([{
        name: "email_send",
        summary: "Send email",
        sideEffect: "external-message",
        requiresApproval: false,
        timeoutMs: 30_000,
        inputSchema: {
          type: "object",
          required: ["to"],
          properties: { to: { type: "string" } },
        },
        invoke: async () => {
          deliveries += 1;
          return { messageId: "mail_1" };
        },
      }], undefined, {
        execute: async ({ call, timeoutMs, invoke }) =>
          await service.execute({
            profileId: "profile_1",
            runId: "run_1",
            actionId: call.actionId!,
            toolName: call.name,
            arguments: call.arguments,
            leaseMs: timeoutMs + 5_000,
            invoke,
          }),
      }));
    };
    const call = {
      id: "call_1",
      actionId: "email",
      name: "email_send",
      arguments: { to: "person@example.com" },
    };

    await expect(createClient().callTool(call)).resolves.toMatchObject({
      content: { messageId: "mail_1" },
    });
    await expect(createClient().callTool({ ...call, id: "call_retry" })).resolves.toMatchObject({
      content: { messageId: "mail_1" },
    });
    expect(deliveries).toBe(1);
  });
});

async function database(): Promise<Database.Database> {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  await createRuns(db);
  await createSideEffects(db);
  new AgentRunRepository(db).create({
    id: "run_1",
    profileId: "profile_1",
    workflowId: "workflow_1",
    executionId: "execution_1",
    nodeId: "agent_1",
    userMessage: "send",
  });
  return db;
}
