import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeAgentIntent, type AgentIntentModel } from "./agent-intent-router.ts";
import type { AgentIntentTool } from "./agent-intent-router.ts";

describe("agent intent router", () => {
  it("routes greetings in any language to chat without tool planning", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => ({ mode: "chat", reason: "Greeting.", confidence: 0.95, answer: "Boa noite!" }),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Boa noite!",
      contextMessages: [],
      tools: [],
    });

    assert.equal(decision.mode, "chat");
    assert.equal(decision.answer, "Boa noite!");
  });

  it("routes external action requests to tool_plan", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => ({ mode: "tool_plan", reason: "Needs Drive and Gmail.", confidence: 0.91 }),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Send my CV from Drive to email@example.com",
      contextMessages: [],
      tools: [tool("google_drive_list_files", "List files", "Find files in Drive", "read")],
    });

    assert.equal(decision.mode, "tool_plan");
  });

  it("accepts plain text chat classifications", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => "CHAT",
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Who's you?",
      contextMessages: [],
      tools: [tool("search_files", "Search files", "Find matching files", "read")],
    });

    assert.equal(decision.mode, "chat");
  });

  it("accepts plain text tool classifications", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => "TOOL_PLAN",
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Send my CV by email",
      contextMessages: [],
      tools: [tool("send_message", "Send a message", "Send external messages", "external-message")],
    });

    assert.equal(decision.mode, "tool_plan");
  });

  it("accepts explanatory text containing a tool_plan classification", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => "This should be TOOL_PLAN because it needs an email tool.",
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Email the downloaded file",
      contextMessages: [],
      tools: [tool("send_message", "Send a message", "Send external messages", "external-message")],
    });

    assert.equal(decision.mode, "tool_plan");
  });

  it("does not send schemas or plugin internals to the router prompt", async () => {
    let prompt = "";
    const model: AgentIntentModel = {
      routeIntent: async (input) => {
        prompt = input.messages.map((message) => message.content).join("\n");
        return { mode: "chat", reason: "Catalog question.", confidence: 0.9, answer: "Tools listed." };
      },
    };

    await routeAgentIntent({
      model,
      userMessage: "What can you do?",
      contextMessages: [{ role: "assistant", content: "Hello" }],
      tools: [tool("drive", "Drive", "List files", "read", {
        inputSchema: { properties: { query: { type: "string" } } },
        manifest: { credentials: "secret" },
      })],
    });

    assert.match(prompt, /drive/);
    assert.match(prompt, /List files/);
    assert.doesNotMatch(prompt, /inputSchema|properties|required|query|credential|manifest|secret/i);
  });

  it("falls back to chat when router confidence is low", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => ({ mode: "tool_plan", reason: "Unsure.", confidence: 0.2 }),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Maybe later",
      contextMessages: [],
      tools: [tool("drive", "Drive", "List files", "read")],
    });

    assert.equal(decision.mode, "chat");
  });

  it("falls back to chat when the router returns invalid output", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => ({ nope: true }),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Hola",
      contextMessages: [],
      tools: [],
    });

    assert.equal(decision.mode, "chat");
    assert.equal(decision.answer, undefined);
  });

  it("falls back to chat quickly when the router stalls", async () => {
    const started = Date.now();
    const model: AgentIntentModel = {
      routeIntent: async () => new Promise(() => {}),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Quem e voce?",
      contextMessages: [],
      tools: [],
      timeoutMs: 5,
    });

    assert.equal(decision.mode, "chat");
    assert.equal(decision.answer, undefined);
    assert.ok(Date.now() - started < 100);
  });

  it("falls back to tool_plan when routing stalls on a non-chat request with tools", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => new Promise(() => {}),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Busque meu curriculo no Drive, baixe e envie por email",
      contextMessages: [],
      tools: [
        tool("search_files", "Search files", "Find matching files", "read"),
        tool("send_message", "Send a message", "Send external messages", "external-message"),
      ],
      timeoutMs: 5,
    });

    assert.equal(decision.mode, "tool_plan");
  });

  it("keeps simple conversation as chat when routing stalls", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => new Promise(() => {}),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Boa noite!",
      contextMessages: [],
      tools: [tool("search_files", "Search files", "Find matching files", "read")],
      timeoutMs: 5,
    });

    assert.equal(decision.mode, "chat");
  });

  it("keeps short identity questions as chat when routing returns invalid JSON with tools", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => {
        throw new Error("Model returned invalid JSON");
      },
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Who's you?",
      contextMessages: [],
      tools: [
        tool("search_files", "Search files", "Find matching files", "read"),
        tool("send_message", "Send a message", "Send external messages", "external-message"),
      ],
      timeoutMs: 5,
    });

    assert.equal(decision.mode, "chat");
  });
});

function tool(
  name: string,
  description: string,
  instructions: string,
  sideEffect: AgentIntentTool["sideEffect"],
  extras: Record<string, unknown> = {},
): AgentIntentTool {
  return {
    name,
    description,
    instructions,
    sideEffect,
    ...extras,
  };
}
