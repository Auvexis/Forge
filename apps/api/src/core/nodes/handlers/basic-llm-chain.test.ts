import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { ChatModelRef, OutputParserRef } from "../../modules/ai-services/ai-service-types.ts";
import { ChatModelExecutionService } from "../../modules/ai-services/chat-model-execution-service.ts";
import type { ResolvedConfigDependencies } from "../dependencies/dependency-types.ts";
import { basicLlmChainNodeHandler } from "./basic-llm-chain.ts";

describe("Basic LLM Chain", () => {
  const originalInvoke = ChatModelExecutionService.prototype.invoke;
  afterEach(() => { ChatModelExecutionService.prototype.invoke = originalInvoke; });

  it("evaluates templates and returns raw model text without a parser", async () => {
    const calls: string[] = [];
    const model = { providerId: "openai", methodId: "chat", configuration: { type: "ai-model", name: "Model", pluginId: "openai", adapter: "openai-compatible", model: "gpt-test", temperature: 0 } } as ChatModelRef;
    ChatModelExecutionService.prototype.invoke = async (_model, request) => {
      calls.push(JSON.stringify(request));
      return { content: "Plain answer" };
    };
    const dependencyCalls: string[] = [];
    const result = await basicLlmChainNodeHandler.execute(input({
      getOne: <T>(handleId: string) => { dependencyCalls.push(`one:${handleId}`); return model as T; },
      getOptional: <T>(handleId: string) => { dependencyCalls.push(`optional:${handleId}`); return undefined as T | undefined; },
      getMany: () => [],
    }));

    assert.equal(result, "Plain answer");
    assert.deepEqual(dependencyCalls, ["one:model", "optional:outputParser"]);
    assert.match(calls[0] ?? "", /Answer for Andre/);
    assert.match(calls[0] ?? "", /Invoice 42/);
  });

  it("returns parsed output with raw model text metadata", async () => {
    const model = { providerId: "openai", configuration: { type: "ai-model", name: "Model", pluginId: "openai", adapter: "openai-compatible", model: "gpt-test", temperature: 0 } } as ChatModelRef;
    const parser: OutputParserRef = { parse: async (value) => JSON.parse(value) };
    ChatModelExecutionService.prototype.invoke = async () => ({ content: '{"category":"billing"}' });

    const result = await basicLlmChainNodeHandler.execute(input({
      getOne: <T>() => model as T,
      getOptional: <T>() => parser as T,
      getMany: () => [],
    }));

    assert.deepEqual(result, {
      output: { category: "billing" },
      rawOutput: '{"category":"billing"}',
      metadata: { parsed: true },
    });
  });
});

function input(resolveConfigDependencies: ResolvedConfigDependencies) {
  return {
    nodeId: "chain",
    node: { type: "basic-llm-chain", name: "Chain", prompt: "Answer for {{ trigger.customer }}", input: "{{ steps.invoice.output }}" },
    context: { trigger: { customer: "Andre" }, steps: { invoice: { output: "Invoice 42" } }, variables: {} },
    workflow: { metadata: { id: "wf", name: "Workflow", version: "1", isActive: true, isDraft: false, public: false, createdAt: new Date(0).toISOString() }, trigger: { type: "manual" }, nodes: {}, edges: [] },
    edges: [],
    executionId: "exec",
    services: {
      resolveConfigDependencies: async () => resolveConfigDependencies,
      executeNode: async () => undefined,
      executeWorkflow: async () => undefined,
      getWorkflowById: () => null,
      emitInternalEvent: async () => ({ triggered: [] }),
      resolvePendingWebhookResponse: () => false,
      emitNodeStart: () => undefined,
      emitNodeSuccess: () => undefined,
      emitNodeFailure: () => undefined,
    },
  } as any;
}
