import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiAgentNodeConfig } from "./agent-types.ts";
import { buildAgentGraph } from "./agent-graph-builder.ts";

describe("agent graph builder", () => {
  it("builds a graph with a model and no tools", async () => {
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([{ content: "hello from model" }]),
      tools: [],
    });

    const result = await graph.invoke({ userMessage: "hello" });

    assert.equal(result.status, "success");
    assert.equal(result.output, "hello from model");
    assert.equal(result.iterationCount, 1);
    assert.equal(result.toolCallCount, 0);
  });

  it("builds a graph that executes requested tools", async () => {
    const toolCalls = [{ id: "call_1", name: "lookup", args: { query: "sailor" } }];
    const tool = fakeTool("lookup", async (args) => ({ result: `found ${args.query}` }));
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([
        { content: "", toolCalls },
        { content: "tool result applied" },
      ]),
      tools: [tool],
    });

    const result = await graph.invoke({ userMessage: "lookup sailor" });

    assert.equal(result.status, "success");
    assert.equal(result.output, "tool result applied");
    assert.equal(result.iterationCount, 2);
    assert.equal(result.toolCallCount, 1);
    assert.deepEqual(tool.calls, [{ query: "sailor" }]);
  });

  it("includes short-term memory checkpointer config when provided", async () => {
    const checkpointer = { tag: "profile-db-checkpointer" };
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([{ content: "remembered" }]),
      tools: [],
      checkpointer,
    });

    assert.equal(graph.checkpointer, checkpointer);
    await graph.invoke({ userMessage: "hello", sessionId: "session_1" });
  });

  it("limits tool loops by max iterations", async () => {
    const graph = buildAgentGraph({
      agent: agentConfig({ maxIterations: 2 }),
      model: fakeModel([
        { content: "", toolCalls: [{ id: "call_1", name: "lookup", args: {} }] },
        { content: "", toolCalls: [{ id: "call_2", name: "lookup", args: {} }] },
        { content: "should not be reached" },
      ]),
      tools: [fakeTool("lookup", async () => ({ ok: true }))],
    });

    await assert.rejects(
      graph.invoke({ userMessage: "loop" }),
      /max iterations/i,
    );
  });

  it("returns final JSON output only when schema validates", async () => {
    const graph = buildAgentGraph({
      agent: agentConfig({
        outputMode: "json",
        outputSchema: {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string" } },
          additionalProperties: false,
        },
      }),
      model: fakeModel([{ content: JSON.stringify({ answer: "ok" }) }]),
      tools: [],
    });

    assert.deepEqual((await graph.invoke({ userMessage: "json" })).output, { answer: "ok" });

    const invalidGraph = buildAgentGraph({
      agent: agentConfig({
        outputMode: "json",
        outputSchema: {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string" } },
        },
      }),
      model: fakeModel([{ content: JSON.stringify({ answer: 42 }) }]),
      tools: [],
    });

    await assert.rejects(invalidGraph.invoke({ userMessage: "json" }), /schema/i);
  });

  it("emits model and tool events through injected callbacks", async () => {
    const events: string[] = [];
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([
        { content: "", toolCalls: [{ id: "call_1", name: "lookup", args: {} }] },
        { content: "done" },
      ]),
      tools: [fakeTool("lookup", async () => ({ ok: true }))],
      onEvent: (event) => events.push(event.type),
    });

    await graph.invoke({ userMessage: "events" });

    assert.deepEqual(events, [
      "agent:model-start",
      "agent:model-end",
      "agent:tool-start",
      "agent:tool-end",
      "agent:model-start",
      "agent:model-end",
    ]);
  });
});

function agentConfig(overrides: Partial<AiAgentNodeConfig> = {}): AiAgentNodeConfig {
  return {
    type: "ai-agent",
    name: "Agent",
    prompt: "You are helpful.",
    maxIterations: 4,
    maxToolCalls: 4,
    timeoutMs: 30000,
    requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
    outputMode: "text",
    ...overrides,
  };
}

function fakeModel(responses: Array<{ content: string; toolCalls?: unknown[] }>) {
  let index = 0;
  return {
    calls: [] as unknown[],
    async invoke(messages: unknown[]) {
      this.calls.push(messages);
      return responses[Math.min(index++, responses.length - 1)];
    },
  };
}

function fakeTool(name: string, invoke: (args: any) => Promise<unknown>) {
  return {
    name,
    calls: [] as unknown[],
    async invoke(args: unknown) {
      this.calls.push(args);
      return invoke(args);
    },
  };
}
