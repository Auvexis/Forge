import type { AiMemoryNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const aiMemoryNodeHandler = createNodeHandler<AiMemoryNode>("ai-memory", ({ node }) => ({
  type: "ai-memory",
  name: node.name,
  scope: node.scope,
  readEnabled: node.readEnabled,
  writeEnabled: node.writeEnabled,
  maxRetrievedMemories: node.maxRetrievedMemories,
  maxMemoryChars: node.maxMemoryChars,
}), {
  description: "Configuration node that provides memory policy to an AI Agent.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Memory" }],
  errors: ["Invalid AI memory configuration"],
});
