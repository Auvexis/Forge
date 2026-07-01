import type { BasicLlmChainNode } from "../../../shared/models/workflow-types.ts";
import type { ChatModelRef, OutputParserRef } from "../../modules/ai-services/ai-service-types.ts";
import { ChatModelExecutionService } from "../../modules/ai-services/chat-model-execution-service.ts";
import { TemplateEngine } from "../../modules/workflows/template-engine.ts";
import { ConfigDependencyResolver } from "../dependencies/config-dependency-resolver.ts";
import { createCoreCapabilityAdapterRegistry } from "../dependencies/core-capability-adapters.ts";
import { createNodeHandler } from "../handler.ts";

export const basicLlmChainNodeHandler = createNodeHandler<BasicLlmChainNode>("basic-llm-chain", async (input) => {
  const dependencies = input.services.resolveConfigDependencies
    ? await input.services.resolveConfigDependencies(input.nodeId)
    : await new ConfigDependencyResolver(createCoreCapabilityAdapterRegistry()).resolveForNode(input, input.nodeId);
  const model = dependencies.getOne<ChatModelRef>("model");
  const parser = dependencies.getOptional<OutputParserRef>("outputParser");
  const prompt = String(TemplateEngine.evaluate(input.node.prompt, input.context, { escape: "prompt" }));
  const value = TemplateEngine.evaluate(input.node.input, input.context);
  const raw = await new ChatModelExecutionService().invoke(model, {
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: typeof value === "string" ? value : JSON.stringify(value) },
    ],
  });
  const rawOutput = extractModelText(raw);
  if (!parser) return rawOutput;
  return { output: await parser.parse(rawOutput), rawOutput, metadata: { parsed: true } };
}, {
  description: "Run a prompt through a chat model with optional structured output.",
  execution: "external-io",
  sideEffects: ["network"],
  inputs: ["chat-model", "output-parser"],
  outputs: [{ id: "default", label: "Output" }],
  errors: ["Missing chat model", "Model invocation failed", "Output parsing failed"],
  usesExternalIO: true,
});

function extractModelText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && typeof (result as { content?: unknown }).content === "string") {
    return (result as { content: string }).content;
  }
  throw new Error("Basic LLM Chain model returned no text content");
}
