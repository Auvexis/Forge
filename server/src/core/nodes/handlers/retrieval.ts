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
  const items = node.format === "json-array"
    ? jsonArrayToItems(node.text, nodeId, node.metadata ?? {})
    : plainTextToItems(node.text, nodeId, node.metadata ?? {});

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

function plainTextToItems(
  value: string,
  nodeId: string,
  metadata: Record<string, any>,
): DatasetOutput["items"] {
  const text = value.trim();
  return text
    ? [{
        id: `${nodeId}:0`,
        text,
        metadata,
        raw: text,
      }]
    : [];
}

function jsonArrayToItems(
  value: string,
  nodeId: string,
  baseMetadata: Record<string, any>,
): DatasetOutput["items"] {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error("Text Dataset json-array format must parse to an array.");
  }

  return parsed.map((entry, index) => {
    const record = entry && typeof entry === "object" && !Array.isArray(entry)
      ? entry as Record<string, any>
      : { value: entry };
    const id = String(record.id ?? record.key ?? `${nodeId}:${index}`);
    const text = String(record.text ?? record.body ?? record.content ?? record.value ?? "");
    const {
      id: _id,
      key: _key,
      text: _text,
      body: _body,
      content: _content,
      value: _value,
      ...metadata
    } = record;

    return {
      id,
      text,
      metadata: {
        ...baseMetadata,
        ...metadata,
      },
      raw: entry,
    };
  });
}

export const fileDatasetNodeHandler = createNodeHandler<FileDatasetNode>("file-dataset", ({ node, nodeId }) => {
  const files = node.files?.length
    ? node.files
    : [node.filePath, node.fileUrl].filter((value): value is string => Boolean(value));
  const items = files.map((file, index) => {
    if (typeof file === "string") {
      return {
        id: `${nodeId}:${index}`,
        text: file,
        metadata: {
          ...(node.metadata ?? {}),
          source: file,
        },
        raw: file,
      };
    }

    return {
      id: `${nodeId}:${index}`,
      text: decodeFileContent(file.content),
      metadata: {
        ...(node.metadata ?? {}),
        filename: file.filename,
        ...(file.mimeType ? { mimeType: file.mimeType } : {}),
        ...(file.size !== undefined ? { size: file.size } : {}),
      },
      raw: file,
    };
  });

  return {
    items,
    count: items.length,
    sourceType: "file",
  } satisfies DatasetOutput;
}, {
  description: "Defines a file dataset source for downstream loading and chunking.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "File Dataset" }],
  errors: ["Invalid file dataset"],
});

function decodeFileContent(content: string): string {
  const encoded = content.includes(",") ? content.slice(content.indexOf(",") + 1) : content;
  return Buffer.from(encoded, "base64").toString("utf8");
}

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
