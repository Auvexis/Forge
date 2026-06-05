import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listPublishedAgentsForProfile } from "./published-agent-directory.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";

describe("published agent directory", () => {
  it("lists one agent for a published Chat Trigger -> AI Agent -> AI Model path", () => {
    const agents = listPublishedAgentsForProfile("profile_a", [workflowFixture()]);

    assert.deepEqual(agents.map((agent) => ({
      key: agent.key,
      profileId: agent.profileId,
      workflowId: agent.workflowId,
      triggerNodeId: agent.triggerNodeId,
      agentNodeId: agent.agentNodeId,
      chatSlug: agent.chatSlug,
      name: agent.name,
      emoji: agent.emoji,
      executionMode: agent.executionMode,
    })), [{
      key: "profile_a:workflow_agent:chat_trigger:agent",
      profileId: "profile_a",
      workflowId: "workflow_agent",
      triggerNodeId: "chat_trigger",
      agentNodeId: "agent",
      chatSlug: "support-agent",
      name: "Support Agent",
      emoji: "\u{1F916}",
      executionMode: "plan",
    }]);
  });

  it("does not list draft, inactive, missing-slug, missing-model, or unreachable agents", () => {
    const draft = workflowFixture({ metadata: { ...workflowFixture().metadata, isDraft: true } });
    const inactive = workflowFixture({ metadata: { ...workflowFixture().metadata, isActive: false } });
    const noSlug = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        chat_trigger: {
          ...workflowFixture().nodes.chat_trigger,
          trigger: { type: "chat" },
        } as any,
      },
    });
    const noModel = workflowFixture({
      edges: [{ id: "trigger-agent", source: "chat_trigger", target: "agent" }],
    });
    const unreachable = workflowFixture({
      edges: [{ id: "model-agent", source: "model", target: "agent" }],
    });

    assert.equal(listPublishedAgentsForProfile("profile_a", [draft, inactive, noSlug, noModel, unreachable]).length, 0);
  });

  it("lists multiple reachable agents from one published workflow", () => {
    const workflow = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        agent_two: {
          type: "ai-agent",
          name: "Billing Agent",
          agentDisplayName: "Billing Agent",
          agentEmoji: "\u{1F4B3}",
          prompt: "Help with billing.",
          maxIterations: 4,
          maxToolCalls: 4,
          timeoutMs: 30000,
          requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
          outputMode: "text",
        } as any,
      },
      edges: [
        ...workflowFixture().edges,
        { id: "trigger-agent-two", source: "chat_trigger", target: "agent_two" },
        { id: "model-agent-two", source: "model", target: "agent_two" },
      ],
    });

    const agents = listPublishedAgentsForProfile("profile_a", [workflow]);

    assert.deepEqual(agents.map((agent) => agent.agentNodeId), ["agent", "agent_two"]);
  });
});

function workflowFixture(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    metadata: {
      id: "workflow_agent",
      name: "Agent Workflow",
      version: "1",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: new Date(0).toISOString(),
    },
    trigger: { type: "manual" },
    nodes: {
      chat_trigger: {
        type: "trigger",
        name: "Chat",
        trigger: {
          type: "chat",
          chatSlug: "support-agent",
          chatTitle: "Support",
          chatAuthMode: "profile",
          chatSessionMode: "resume-by-session-id",
          chatRateLimitPerMinute: 30,
        },
      },
      agent: {
        type: "ai-agent",
        name: "Agent",
        agentDisplayName: "Support Agent",
        agentEmoji: "\u{1F916}",
        prompt: "Help users.",
        maxIterations: 4,
        maxToolCalls: 4,
        timeoutMs: 30000,
        requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
        outputMode: "text",
      } as any,
      model: {
        type: "ai-model",
        name: "Model",
        pluginId: "openai",
        adapter: "openai-compatible",
        model: "gpt-test",
        temperature: 0,
      },
    },
    edges: [
      { id: "trigger-agent", source: "chat_trigger", target: "agent" },
      { id: "model-agent", source: "model", target: "agent" },
    ],
    ...overrides,
  };
}
