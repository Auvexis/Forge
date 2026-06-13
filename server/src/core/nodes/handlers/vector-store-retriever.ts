import type { VectorStoreRetrieverNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const vectorStoreRetrieverNodeHandler = createNodeHandler<VectorStoreRetrieverNode>("vector-store-retriever", ({ node }) => ({
  topK: node.topK,
  scoreThreshold: node.scoreThreshold,
  filter: node.filter ?? {},
  maxContextChars: node.maxContextChars,
}), {
  description: "Expose a Vector Store as a reusable retriever.",
  execution: "stateless",
  sideEffects: ["none"],
  inputs: ["vector-store"],
  outputs: [{ id: "default", label: "Retriever" }],
  errors: ["Missing Vector Store", "Retrieval failed"],
});
