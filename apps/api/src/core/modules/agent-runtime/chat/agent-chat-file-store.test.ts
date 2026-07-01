import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { AgentChatFileStore } from "./agent-chat-file-store.ts";

describe("AgentChatFileStore", () => {
  it("creates, lists, reads, appends and deletes chat files", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-chat-store-"));
    const store = new AgentChatFileStore({ profilesDir: path.join(root, "profiles") });

    const session = store.createSession({
      id: "chat_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      agentNodeId: "agent_1",
      agentKey: "profile_1:agent",
      title: "Hello",
      status: "active",
    });
    const userMessage = store.appendMessage({
      id: "msg_1",
      profileId: "profile_1",
      sessionId: "chat_1",
      role: "user",
      content: "hello",
    });
    store.appendExecution("profile_1", "chat_1", { executionId: "exec_1", status: "SUCCESS" });

    const filePath = path.join(root, "profiles", "profile_1", "chats", "chat_1", "chat.json");
    assert.equal(fs.existsSync(filePath), true);
    assert.equal(session.id, "chat_1");
    assert.equal(userMessage.createdAt >= session.createdAt, true);
    assert.deepEqual(store.listSessionsByAgentKey("profile_1", "profile_1:agent").map((item) => item.id), ["chat_1"]);
    assert.equal(store.getSession("profile_1", "chat_1")?.title, "Hello");
    assert.deepEqual(store.listMessages("profile_1", "chat_1").map((message) => message.content), ["hello"]);
    assert.equal(store.getChat("profile_1", "chat_1")?.executions.length, 1);

    assert.equal(store.deleteSession("profile_1", "chat_1"), true);
    assert.equal(fs.existsSync(path.dirname(filePath)), false);
    assert.equal(store.getSession("profile_1", "chat_1"), null);
  });

  it("orders sessions by updatedAt descending", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-chat-store-"));
    const store = new AgentChatFileStore({ profilesDir: path.join(root, "profiles") });

    store.createSession(baseSession("chat_old"));
    store.createSession(baseSession("chat_new"));
    store.appendMessage({
      id: "msg_1",
      profileId: "profile_1",
      sessionId: "chat_old",
      role: "assistant",
      content: "bump",
    });

    assert.deepEqual(store.listSessionsByAgentKey("profile_1", "profile_1:agent").map((session) => session.id), [
      "chat_old",
      "chat_new",
    ]);
  });
});

function baseSession(id: string) {
  return {
    id,
    profileId: "profile_1",
    workflowId: "workflow_1",
    triggerNodeId: "trigger_1",
    agentKey: "profile_1:agent",
    title: id,
    status: "active",
  };
}
