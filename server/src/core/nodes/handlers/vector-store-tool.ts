import type { VectorStoreToolNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const vectorStoreToolNodeHandler = createNodeHandler<VectorStoreToolNode>("vector-store-tool", ({ node }) => ({
  toolName: node.toolName,
  description: node.description,
  topK: node.topK,
  scoreThreshold: node.scoreThreshold,
  instructions: node.instructions,
}), {
  description: "Expose Vector Store retrieval as an Agent tool.",
  execution: "stateless",
  sideEffects: ["none"],
  inputs: ["vector-store", "chat-model"],
  outputs: [{ id: "default", label: "Tool" }],
  errors: ["Missing Vector Store", "Missing chat model", "Retrieval failed", "Model invocation failed"],
});
