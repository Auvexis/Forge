import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { ChatModelRef, RetrievalResult, RetrieverRef } from "../../modules/ai-services/ai-service-types.ts";
import { ChatModelExecutionService } from "../../modules/ai-services/chat-model-execution-service.ts";
import type { ResolvedConfigDependencies } from "../dependencies/dependency-types.ts";
import { questionAnswerChainNodeHandler } from "./question-answer-chain.ts";

describe("Question and Answer Chain", () => {
  const originalInvoke = ChatModelExecutionService.prototype.invoke;
  afterEach(() => { ChatModelExecutionService.prototype.invoke = originalInvoke; });

  it("answers from retrieved context and preserves sources and metadata", async () => {
    const retrieval: RetrievalResult = {
      query: "Where is invoice 42?",
      documents: [
        { id: "invoice", content: "Invoice 42 is in the billing portal.", score: 0.94, metadata: { section: "billing" } },
        { id: "login", content: "Use the account email to sign in.", score: 0.88, metadata: {} },
      ],
      context: "Invoice 42 is in the billing portal.\n\nUse the account email to sign in.",
      metadata: { providerId: "qdrant", topK: 2, documentCount: 2 },
    };
    const queries: string[] = [];
    const retriever: RetrieverRef = { retrieve: async (query) => { queries.push(query); return retrieval; } };
    const model = { providerId: "openai", configuration: { type: "ai-model", name: "Model", pluginId: "openai", adapter: "openai-compatible", model: "gpt-test", temperature: 0 } } as ChatModelRef;
    const modelCalls: Record<string, any>[] = [];
    ChatModelExecutionService.prototype.invoke = async (_model, request) => {
      modelCalls.push(request);
      return { content: "Open the billing portal." };
    };

    const result = await questionAnswerChainNodeHandler.execute(input({
      getOne: <T>(handleId: string) => (handleId === "model" ? model : retriever) as T,
      getOptional: () => undefined,
      getMany: () => [],
    }));

    assert.deepEqual(queries, ["Where is invoice 42?"]);
    assert.match(JSON.stringify(modelCalls[0]), /Answer only from the supplied context/);
    assert.match(JSON.stringify(modelCalls[0]), /acknowledge that the evidence is missing/);
    assert.match(JSON.stringify(modelCalls[0]), /Invoice 42 is in the billing portal/);
    assert.deepEqual(result, {
      answer: "Open the billing portal.",
      sources: retrieval.documents,
      metadata: {
        retrieval: { providerId: "qdrant", topK: 2, documentCount: 2 },
        model: { providerId: "openai" },
      },
    });
  });
});

function input(resolveConfigDependencies: ResolvedConfigDependencies) {
  return {
    nodeId: "qa",
    node: { type: "question-answer-chain", name: "Q&A", question: "Where is {{ steps.invoice.output }}?", instructions: "Keep the answer concise." },
    context: { trigger: {}, steps: { invoice: { output: "invoice 42" } }, variables: {} },
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
