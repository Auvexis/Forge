import type { AiMemoryNode, AiModelNode, AiToolNode, EmbeddingsNode, StructuredJsonParserNode, VectorStoreNode, VectorStoreRetrieverNode } from "../../../shared/models/workflow-types.ts";
import { validateAiModelConfig } from "../../modules/agent-runtime/agent-validation.ts";
import type { AiMemoryNodeConfig, AiToolNodeConfig } from "../../modules/agent-runtime/agent-types.ts";
import type { ChatModelRef, DocumentSourceRef, EmbeddingModelRef, OutputParserRef, RetrieverRef, VectorStoreRef } from "../../modules/ai-services/ai-service-types.ts";
import { OutputParserExecutionService } from "../../modules/ai-services/output-parser-execution-service.ts";
import { RetrieverExecutionService } from "../../modules/ai-services/retriever-execution-service.ts";
import { TemplateEngine } from "../../modules/workflows/template-engine.ts";
import { CapabilityAdapterRegistry } from "./capability-adapter-registry.ts";

export function createCoreCapabilityAdapterRegistry(): CapabilityAdapterRegistry {
  const registry = new CapabilityAdapterRegistry();
  registry.register({ capability: "chat-model", supports: (node) => node.type === "ai-model", resolve: async (context, nodeId) => toChatModelRef(context.execution.workflow.nodes[nodeId] as AiModelNode) });
  registry.register({ capability: "memory-store", supports: (node) => node.type === "ai-memory", resolve: async (context, nodeId) => {
    const node = context.execution.workflow.nodes[nodeId] as AiMemoryNode;
    return { type: "ai-memory", name: node.name, scope: node.scope, readEnabled: node.readEnabled, writeEnabled: node.writeEnabled, maxRetrievedMemories: node.maxRetrievedMemories, maxMemoryChars: node.maxMemoryChars, adapter: node.adapter, pluginId: node.pluginId, searchMethodId: node.searchMethodId, putMethodId: node.putMethodId } satisfies AiMemoryNodeConfig;
  } });
  registry.register({ capability: "agent-tool", supports: (node) => node.type === "ai-tool", resolve: async (context, nodeId) => {
    const node = context.execution.workflow.nodes[nodeId] as AiToolNode;
    return { type: "ai-tool", name: node.name, pluginId: node.pluginId, methodId: node.methodId, descriptionOverride: node.descriptionOverride ? String(TemplateEngine.evaluate(node.descriptionOverride, context.execution.context, { escape: "prompt" })) : undefined, timeoutMs: node.timeoutMs, requiresApproval: node.requiresApproval, sideEffect: node.sideEffect, inputDefaults: node.inputDefaults ? TemplateEngine.evaluate(node.inputDefaults, context.execution.context) as Record<string, any> : undefined } satisfies AiToolNodeConfig;
  } });
  registry.register({ capability: "embedding-model", supports: (node) => node.type === "embeddings", resolve: async (context, nodeId) => {
    const node = context.execution.workflow.nodes[nodeId] as EmbeddingsNode;
    return { providerId: node.pluginId, methodId: node.methodId, configuration: { model: node.model, dimension: node.dimension, batchSize: node.batchSize } } satisfies EmbeddingModelRef;
  } });
  registry.register({ capability: "output-parser", supports: (node) => node.type === "structured-json-parser", resolve: async (context, nodeId) => {
    const node = context.execution.workflow.nodes[nodeId] as StructuredJsonParserNode;
    const service = new OutputParserExecutionService(node.schema, node.strict);
    return { parse: (value: string) => service.parse(value) } satisfies OutputParserRef;
  } });
  registry.register({ capability: "retriever", supports: (node) => node.type === "vector-store-retriever", resolve: async (context, nodeId) => {
    const node = context.execution.workflow.nodes[nodeId] as VectorStoreRetrieverNode;
    const dependencies = await context.resolveDependencies(nodeId);
    const vectorStore = dependencies.getOne<VectorStoreRef>("vectorStore");
    const executePluginMethod = context.execution.services.executePluginMethod;
    if (!executePluginMethod) throw new Error("Vector Store Retriever requires plugin execution services.");
    const service = new RetrieverExecutionService(executePluginMethod);
    return {
      retrieve: (query: string) => service.retrieve(vectorStore, {
        query,
        topK: node.topK,
        scoreThreshold: node.scoreThreshold,
        filter: node.filter,
        maxContextChars: node.maxContextChars,
      }),
    } satisfies RetrieverRef;
  } });
  registry.register({ capability: "vector-store", supports: (node) => node.type === "vector-store", resolve: async (context, nodeId) => {
    const node = context.execution.workflow.nodes[nodeId] as VectorStoreNode;
    const dependencies = await context.resolveDependencies(nodeId);
    return { providerId: node.pluginId, methods: { ensureCollection: node.ensureCollectionMethodId, upsertDocuments: node.upsertMethodId, querySimilar: node.queryMethodId }, configuration: { collectionName: node.collectionName, dimension: node.dimension, metric: node.metric, config: node.config }, embedding: dependencies.getOne<EmbeddingModelRef>("embedding") } satisfies VectorStoreRef;
  } });
  for (const type of ["text-dataset", "file-dataset", "database-dataset"] as const) registry.register({ capability: "document-source", supports: (node) => node.type === type, resolve: async (context, nodeId) => ({
    load: async () => context.execution.context.steps[nodeId]?.output ?? context.execution.services.executeNode({ nodeId, node: context.execution.workflow.nodes[nodeId], context: context.execution.context, workflow: context.execution.workflow, edges: context.execution.edges, executionId: context.execution.executionId }),
  } satisfies DocumentSourceRef) });
  return registry;
}

function toChatModelRef(node: AiModelNode): ChatModelRef {
  const legacyProvider = (node as unknown as { provider?: unknown }).provider;
  const configuration = validateAiModelConfig({ type: "ai-model", name: node.name,
    ...(typeof node.pluginId === "string" || typeof node.adapter === "string" ? { pluginId: node.pluginId, adapter: node.adapter } : typeof legacyProvider === "string" ? { provider: legacyProvider } : { pluginId: node.pluginId, adapter: node.adapter }),
    model: node.model, temperature: node.temperature, maxTokens: node.maxTokens, credentialId: node.credentialId, baseUrl: node.baseUrl,
    thinkingEnabled: node.thinkingEnabled, thinkingRequest: node.thinkingRequest, thinkingSupported: node.thinkingSupported });
  return { providerId: configuration.pluginId, configuration };
}
