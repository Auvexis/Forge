import type { QuestionAnswerChainNode } from "../../../shared/models/workflow-types.ts";
import type { ChatModelRef, RetrieverRef } from "../../modules/ai-services/ai-service-types.ts";
import { ChatModelExecutionService } from "../../modules/ai-services/chat-model-execution-service.ts";
import { TemplateEngine } from "../../modules/workflows/template-engine.ts";
import { ConfigDependencyResolver } from "../dependencies/config-dependency-resolver.ts";
import { createCoreCapabilityAdapterRegistry } from "../dependencies/core-capability-adapters.ts";
import { createNodeHandler } from "../handler.ts";

export const questionAnswerChainNodeHandler = createNodeHandler<QuestionAnswerChainNode>("question-answer-chain", async (input) => {
  const dependencies = input.services.resolveConfigDependencies
    ? await input.services.resolveConfigDependencies(input.nodeId)
    : await new ConfigDependencyResolver(createCoreCapabilityAdapterRegistry()).resolveForNode(input, input.nodeId);
  const model = dependencies.getOne<ChatModelRef>("model");
  const retriever = dependencies.getOne<RetrieverRef>("retriever");
  const question = String(TemplateEngine.evaluate(input.node.question, input.context, { escape: "prompt" }));
  const instructions = input.node.instructions
    ? String(TemplateEngine.evaluate(input.node.instructions, input.context, { escape: "prompt" }))
    : "";
  const retrieval = await retriever.retrieve(question);
  const raw = await new ChatModelExecutionService().invoke(model, {
    messages: [
      {
        role: "system",
        content: [
          "Answer only from the supplied context.",
          "When the context does not contain enough evidence, acknowledge that the evidence is missing.",
          instructions,
          `Context:\n${retrieval.context}`,
        ].filter(Boolean).join("\n\n"),
      },
      { role: "user", content: question },
    ],
  });

  return {
    answer: extractModelText(raw),
    sources: retrieval.documents,
    metadata: {
      retrieval: { ...retrieval.metadata, documentCount: retrieval.documents.length },
      model: { providerId: model.providerId },
    },
  };
}, {
  description: "Answer a question with a chat model and retriever context.",
  execution: "external-io",
  sideEffects: ["network"],
  inputs: ["chat-model", "retriever"],
  outputs: [{ id: "default", label: "Answer" }],
  errors: ["Missing chat model", "Missing retriever", "Retrieval failed", "Model invocation failed"],
  usesExternalIO: true,
});

function extractModelText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && typeof (result as { content?: unknown }).content === "string") {
    return (result as { content: string }).content;
  }
  throw new Error("Question and Answer Chain model returned no text content");
}
