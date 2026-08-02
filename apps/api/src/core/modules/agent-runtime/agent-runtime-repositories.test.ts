import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { up } from "../../database/migrations/workflows/005_agent_sessions.ts";
import { AgentApprovalService } from "./agent-approval-service.ts";
import { ChatSessionRepository } from "./chat/chat-session-repository.ts";
import { AgentMemoryStore } from "./memory/agent-memory-store.ts";

describe("agent runtime repositories", () => {
  it("creates profile-scoped chat sessions and blocks cross-profile reads", async () => {
    const db = createDb();
    const sessions = new ChatSessionRepository(db);

    const session = sessions.create({
      id: "chat_1",
      profileId: "profile_a",
      workflowId: "workflow_1",
      triggerNodeId: "trigger",
      title: "Support",
      status: "active",
    });

    assert.equal(session.id, "chat_1");
    assert.equal(session.profileId, "profile_a");
    assert.ok(session.createdAt);
    assert.deepEqual(sessions.getById("profile_b", "chat_1"), null);
  });

  it("upserts and searches long-term memories by namespace", async () => {
    const db = createDb();
    const store = new AgentMemoryStore(db);

    const first = store.put({
      id: "mem_1",
      profileId: "profile_a",
      namespace: "workflow:profile_a:workflow_1",
      key: "tone",
      value: { preference: "concise" },
      source: "manual",
    });
    const second = store.put({
      id: "mem_2",
      profileId: "profile_a",
      namespace: "workflow:profile_a:workflow_1",
      key: "tone",
      value: { preference: "detailed" },
      source: "agent",
    });

    assert.equal(second.id, "mem_1");
    assert.equal(second.createdAt, first.createdAt);
    assert.notEqual(second.updatedAt, first.updatedAt);
    assert.deepEqual(store.search({
      profileId: "profile_a",
      namespace: "workflow:profile_a:workflow_1",
    }).map((memory) => memory.value), [{ preference: "detailed" }]);
  });

  it("creates and resolves tool approvals", async () => {
    const db = createDb();
    const approvals = new AgentApprovalService(db);

    const approval = approvals.create({
      id: "approval_1",
      profileId: "profile_a",
      workflowId: "workflow_1",
      executionId: "exec_1",
      sessionId: "chat_1",
      toolName: "github_create_issue",
      request: { title: "Bug" },
    });
    const resolved = approvals.resolve("profile_a", "approval_1", {
      status: "approved",
      decision: { approvedBy: "tester" },
    });

    assert.equal(approval.status, "pending");
    assert.equal(resolved?.status, "approved");
    assert.deepEqual(approvals.getById("profile_b", "approval_1"), null);
  });
});

function createDb(): Database.Database {
  const db = new Database(":memory:");
  up(db);
  return db;
}
