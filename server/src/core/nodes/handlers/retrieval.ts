import type {
  DatabaseDatasetNode,
  DatasetOutput,
  EmbeddingsNode,
  FileDatasetNode,
  RetrieverNode,
  TextDatasetNode,
  VectorStoreNode,
} from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const textDatasetNodeHandler = createNodeHandler<TextDatasetNode>("text-dataset", ({ node, nodeId }) => {
  const text = node.text.trim();
  const items = text
    ? [{
        id: `${nodeId}:0`,
        text,
        metadata: node.metadata ?? {},
        raw: text,
      }]
    : [];

  return {
    items,
    count: items.length,
    sourceType: "text",
  } satisfies DatasetOutput;
}, {
  description: "Loads text into generic dataset items for workflow and retrieval steps.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Items" }],
  errors: ["Invalid text dataset"],
});

export const fileDatasetNodeHandler = createNodeHandler<FileDatasetNode>("file-dataset", ({ node }) => ({
  sourceType: "file",
  filePath: node.filePath,
  fileUrl: node.fileUrl,
  format: node.format,
  chunking: node.chunking,
  metadata: node.metadata ?? {},
}), {
  description: "Defines a file dataset source for downstream loading and chunking.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "File Dataset" }],
  errors: ["Invalid file dataset"],
});

export const databaseDatasetNodeHandler = createNodeHandler<DatabaseDatasetNode>("database-dataset", ({ node }) => ({
  sourceType: "database",
  pluginId: node.pluginId,
  methodId: node.methodId,
  query: node.query,
  textColumns: node.textColumns,
  metadataColumns: node.metadataColumns ?? [],
  limit: node.limit,
  chunking: node.chunking,
}), {
  description: "Defines a database dataset source through a provider plugin.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Database Dataset" }],
  errors: ["Invalid database dataset"],
});

export const embeddingsNodeHandler = createNodeHandler<EmbeddingsNode>("embeddings", ({ node }) => ({
  pluginId: node.pluginId,
  methodId: node.methodId,
  model: node.model,
  dimension: node.dimension,
  input: node.input,
  batchSize: node.batchSize,
}), {
  description: "Defines an embedding provider call for dataset text.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Embeddings" }],
  errors: ["Invalid embeddings config"],
});

export const vectorStoreNodeHandler = createNodeHandler<VectorStoreNode>("vector-store", ({ node }) => ({
  pluginId: node.pluginId,
  methods: {
    ensureCollection: node.ensureCollectionMethodId,
    upsertDocuments: node.upsertMethodId,
    querySimilar: node.queryMethodId,
    deleteDocuments: node.deleteMethodId,
    describeCollection: node.describeMethodId,
  },
  store: {
    collectionName: node.collectionName,
    dimension: node.dimension,
    metric: node.metric,
    config: node.config,
  },
}), {
  description: "Defines a provider-neutral vector store for indexing and retrieval.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Vector Store" }],
  errors: ["Invalid vector store config"],
});

export const retrieverNodeHandler = createNodeHandler<RetrieverNode>("retriever", ({ node }) => ({
  query: node.query,
  topK: node.topK,
  scoreThreshold: node.scoreThreshold,
  outputMode: node.outputMode,
  maxContextChars: node.maxContextChars,
  filter: node.filter ?? {},
}), {
  description: "Defines a provider-neutral retrieval query for vector search context.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Retrieved Context" }],
  errors: ["Invalid retriever config"],
});
