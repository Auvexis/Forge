import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkflowItem, WorkflowNode } from "../../../shared/models/workflow-types.ts";
import { CapabilityAdapterRegistry } from "./capability-adapter-registry.ts";
import { ConfigDependencyResolver } from "./config-dependency-resolver.ts";

describe("ConfigDependencyResolver", () => {
  it("resolves required, optional, and many dependencies by handle id", async () => {
    const registry = registryWith(["chat-model", "agent-tool"]);
    const resolver = new ConfigDependencyResolver(registry);
    const dependencies = await resolver.resolveForNode(execution(workflow([
      edge("model", "agent", "chatModel"), edge("toolA", "agent", "tool"), edge("toolB", "agent", "tool"),
    ])), "agent");

    assert.deepEqual(dependencies.getOne("chatModel"), { nodeId: "model", capability: "chat-model" });
    assert.equal(dependencies.getOptional("memory"), undefined);
    assert.deepEqual(dependencies.getMany("tool").map((value: any) => value.nodeId), ["toolA", "toolB"]);
  });

  it("rejects missing required and incompatible dependencies with handle context", async () => {
    const resolver = new ConfigDependencyResolver(registryWith(["chat-model", "embedding-model"]));
    await assert.rejects(() => resolver.resolveForNode(execution(workflow([])), "agent"), /Node "agent" handle "chatModel" requires capability "chat-model"/);
    await assert.rejects(
      () => resolver.resolveForNode(execution(workflow([edge("embedding", "agent", "chatModel")])), "agent"),
      /Node "agent" handle "chatModel" requires capability "chat-model" but node "embedding" provides \[embedding-model\]/,
    );
  });

  it("rejects one-cardinality overflow", async () => {
    const resolver = new ConfigDependencyResolver(registryWith(["chat-model"]));
    await assert.rejects(
      () => resolver.resolveForNode(execution(workflow([edge("model", "agent", "chatModel"), edge("model2", "agent", "chatModel")])), "agent"),
      /handle "chatModel" accepts one connection but received 2/,
    );
  });

  it("detects recursive configuration cycles with the complete path", async () => {
    const registry = registryWith(["vector-store"]);
    registry.register({
      capability: "retriever",
      supports: (node) => node.type === "retriever",
      resolve: async (context, nodeId) => {
        await context.resolveDependencies(nodeId);
        return { nodeId };
      },
    });
    registry.register({
      capability: "vector-store",
      supports: (node) => node.type === "vector-store",
      resolve: async (context, nodeId) => {
        await context.resolveDependencies(nodeId);
        return { nodeId };
      },
    }, { replace: true });

    const resolver = new ConfigDependencyResolver(registry, (type) => type === "retriever"
      ? definition("retriever", "retriever", "vectorStore", "vector-store")
      : type === "vector-store"
        ? definition("vector-store", "vector-store", "retriever", "retriever")
        : null);
    const item = workflow([edge("vector", "retriever", "vectorStore"), edge("retriever", "vector", "retriever")]);
    await assert.rejects(() => resolver.resolveForNode(execution(item), "retriever"), /Configuration dependency cycle: retriever -> vector -> retriever/);
  });
});

function registryWith(capabilities: string[]) {
  const registry = new CapabilityAdapterRegistry();
  for (const capability of capabilities) registry.register({
    capability,
    supports: () => true,
    resolve: async (_context, nodeId) => ({ nodeId, capability }),
  });
  return registry;
}

function definition(type: string, capability: string, handleId: string, accepts: string): any {
  return { type, role: "configuration", capabilities: [capability], handles: [{ id: handleId, label: handleId, type: "target", position: "bottom", required: true, accepts: [{ capability: accepts }], cardinality: "one" }] };
}

function edge(source: string, target: string, targetHandle: string): any {
  return { id: `${source}-${target}-${targetHandle}`, source, target, targetHandle };
}

function workflow(edges: any[]): WorkflowItem {
  const base = (type: WorkflowNode["type"], name: string) => ({ type, name }) as WorkflowNode;
  return { metadata: { id: "test", name: "test", version: "1", isActive: true, isDraft: false, public: false, createdAt: new Date(0).toISOString() }, trigger: { type: "manual" }, nodes: {
    agent: base("ai-agent", "Agent"), model: base("ai-model", "Model"), model2: base("ai-model", "Model 2"),
    toolA: base("ai-tool", "Tool A"), toolB: base("ai-tool", "Tool B"), embedding: base("embeddings", "Embedding"),
    retriever: base("retriever", "Retriever"), vector: base("vector-store", "Vector"),
  }, edges };
}

function execution(item: WorkflowItem): any {
  return { workflow: item, edges: item.edges, context: { trigger: {}, steps: {}, variables: {} }, services: {}, nodeId: "", node: item.nodes.agent, executionId: "test" };
}
