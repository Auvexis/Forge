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
import type { NodeHandlerInput } from "../types.ts";
import { TemplateEngine } from "../../modules/workflows/template-engine.ts";

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

export const databaseDatasetNodeHandler = createNodeHandler<DatabaseDatasetNode>("database-dataset", async ({ node, nodeId, services }) => {
  if (!services.executePluginMethod) {
    return {
      sourceType: "database",
      pluginId: node.pluginId,
      methodId: node.methodId,
      query: node.query,
      textColumns: node.textColumns,
      metadataColumns: node.metadataColumns ?? [],
      limit: node.limit,
      chunking: node.chunking,
    };
  }

  const result = await services.executePluginMethod(node.pluginId, node.methodId, {
    query: node.query,
    limit: node.limit,
  });
  const rows = Array.isArray(result) ? result : Array.isArray(result?.rows) ? result.rows : [];
  const items = rows.map((row: Record<string, any>, index: number) => ({
    id: String(row.id ?? row.key ?? `${nodeId}:${index}`),
    text: node.textColumns.map((column) => String(row[column] ?? "")).filter(Boolean).join("\n"),
    metadata: Object.fromEntries((node.metadataColumns ?? []).map((column) => [column, row[column]])),
    raw: row,
  }));

  return { items, count: items.length, sourceType: "database" } satisfies DatasetOutput;
}, {
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

export const vectorStoreNodeHandler = createNodeHandler<VectorStoreNode>("vector-store", async (input) => {
  const { node, nodeId, workflow, context, services } = input;
  const store = {
    collectionName: node.collectionName,
    dimension: node.dimension,
    metric: node.metric,
    config: node.config,
  };
  const baseOutput = {
    pluginId: node.pluginId,
    methods: {
      ensureCollection: node.ensureCollectionMethodId,
      upsertDocuments: node.upsertMethodId,
      querySimilar: node.queryMethodId,
      deleteDocuments: node.deleteMethodId,
      describeCollection: node.describeMethodId,
    },
    store,
  };

  const documentEdge = workflow.edges.find((edge) =>
    edge.target === nodeId && edge.targetHandle === "document"
  );
  const embeddingEdge = workflow.edges.find((edge) =>
    edge.target === nodeId && edge.targetHandle === "embedding"
  );
  const mode = node.retrievalMode ?? "index-and-query";
  const query = node.query
    ? String(TemplateEngine.evaluate(node.query, context)).trim()
    : "";
  const shouldIndex = mode !== "query" && Boolean(documentEdge);
  const shouldQuery = mode !== "index" && Boolean(query);
  if (!shouldIndex && !shouldQuery) return baseOutput;
  if (!embeddingEdge) throw new Error("Vector Store indexing and queries require a connected Embeddings node.");
  if (!services.executePluginMethod) throw new Error("Vector Store requires plugin execution services.");

  const embeddingNode = workflow.nodes[embeddingEdge.source];
  if (embeddingNode?.type !== "embeddings") throw new Error("Vector Store embedding handle requires an Embeddings node.");
  const output: Record<string, any> = { ...baseOutput };
  let collectionEnsured = false;

  if (shouldIndex && documentEdge) {
    const datasetOutput = context.steps[documentEdge.source]?.output ?? await executeConfigSource(input, documentEdge.source);
    const items = Array.isArray(datasetOutput?.items) ? datasetOutput.items : [];
    const vectors = await createEmbeddings(services.executePluginMethod, embeddingNode, items.map((item: any) => String(item.text ?? "")));
    if (vectors.length !== items.length) {
      throw new Error(`Embedding provider returned ${vectors.length} vectors for ${items.length} documents.`);
    }

    const documents = items.map((item: any, index: number) => ({
      id: String(item.id ?? `${documentEdge.source}:${index}`),
      text: String(item.text ?? ""),
      vector: vectors[index],
      metadata: item.metadata ?? {},
    }));
    await services.executePluginMethod(node.pluginId, node.ensureCollectionMethodId, { store });
    collectionEnsured = true;
    const upsertResult = await services.executePluginMethod(node.pluginId, node.upsertMethodId, {
      store,
      documents,
    });
    output.indexedCount = Number(upsertResult?.upsertedCount ?? documents.length);
    output.documents = documents;
  }

  if (shouldQuery) {
    const [queryVector] = await createEmbeddings(services.executePluginMethod, embeddingNode, [query]);
    if (!queryVector) throw new Error("Embedding provider did not return a query vector.");
    if (!collectionEnsured) {
      await services.executePluginMethod(node.pluginId, node.ensureCollectionMethodId, { store });
    }
    const queryResult = await services.executePluginMethod(node.pluginId, node.queryMethodId, {
      store,
      query: {
        text: query,
        vector: queryVector,
        topK: node.topK ?? 5,
        filter: node.filter ?? {},
      },
    });
    const items = Array.isArray(queryResult)
      ? queryResult
      : Array.isArray(queryResult?.items)
        ? queryResult.items
        : [];
    output.items = items;
    if ((node.outputMode ?? "context") === "context") {
      const maxChars = node.maxContextChars ?? 8000;
      output.context = items
        .map((item: any) => String(item?.text ?? "").trim())
        .filter(Boolean)
        .join("\n\n")
        .slice(0, maxChars);
    }
  }

  return output;
}, {
  description: "Defines a provider-neutral vector store for indexing and retrieval.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Vector Store" }],
  errors: ["Invalid vector store config"],
});

async function createEmbeddings(
  executePluginMethod: NonNullable<NodeHandlerInput<VectorStoreNode>["services"]["executePluginMethod"]>,
  node: EmbeddingsNode,
  values: string[],
): Promise<number[][]> {
  const result = await executePluginMethod(node.pluginId, node.methodId, {
    model: node.model,
    input: values,
    dimension: node.dimension,
    batchSize: node.batchSize,
  });
  return extractVectors(result);
}

async function executeConfigSource(
  input: NodeHandlerInput<VectorStoreNode>,
  sourceId: string,
): Promise<any> {
  const sourceNode = input.workflow.nodes[sourceId];
  if (!sourceNode) throw new Error(`Vector Store config source ${sourceId} was not found.`);
  return input.services.executeNode({
    nodeId: sourceId,
    node: sourceNode,
    context: input.context,
    workflow: input.workflow,
    edges: input.edges,
    executionId: input.executionId,
  });
}

function extractVectors(result: any): number[][] {
  const values = Array.isArray(result)
    ? result
    : Array.isArray(result?.vectors)
      ? result.vectors
      : Array.isArray(result?.data)
        ? result.data.map((item: any) => item?.embedding ?? item?.vector)
        : [];
  return values.filter((value: unknown) => Array.isArray(value));
}

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
