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
import { TemplateEngine } from "../../modules/workflows/template-engine.ts";
import type { DocumentSourceRef, EmbeddingModelRef, VectorStoreRef } from "../../modules/ai-services/ai-service-types.ts";
import { EmbeddingExecutionService } from "../../modules/ai-services/embedding-execution-service.ts";
import { VectorStoreExecutionService } from "../../modules/ai-services/vector-store-execution-service.ts";
import { ConfigDependencyResolver } from "../dependencies/config-dependency-resolver.ts";
import { createCoreCapabilityAdapterRegistry } from "../dependencies/core-capability-adapters.ts";

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

export const fileDatasetNodeHandler = createNodeHandler<FileDatasetNode>("file-dataset", ({ node, nodeId, context }) => {
  const configuredFiles = node.files?.length
    ? node.files
    : [node.filePath, node.fileUrl].filter((value): value is string => Boolean(value));
  const files = configuredFiles.flatMap((file) => normalizeFileInputs(TemplateEngine.evaluate(file, context)));
  const customMetadata = normalizeMetadata(TemplateEngine.evaluate(node.metadata ?? {}, context));
  const items = files.flatMap((file, fileIndex) => {
    if (typeof file === "string") {
      return {
        id: `${nodeId}:${fileIndex}`,
        text: file,
        metadata: buildFileDatasetMetadata(
          {
            source: file,
          },
          {},
          customMetadata,
        ),
        raw: file,
      };
    }

    const filename = stringValue(file.filename ?? file.fileName ?? file.name);
    const mimeType = stringValue(file.mimeType ?? file.mimetype ?? file.type);
    const size = numberValue(file.size);
    const sourceMetadata = {
      ...(filename ? { filename } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(size !== undefined ? { size } : {}),
    };
    const text = decodeFileContent(file.content ?? file.contentBase64 ?? file.data ?? file.buffer);
    const format = resolveFileDatasetFormat(node.format, filename, mimeType);

    if (format === "csv") {
      return csvToItems(text, `${nodeId}:${fileIndex}`, sourceMetadata, customMetadata);
    }

    return {
      id: `${nodeId}:${fileIndex}`,
      text,
      metadata: buildFileDatasetMetadata(sourceMetadata, {}, customMetadata),
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

type RuntimeFileInput = string | Record<string, any>;

function normalizeFileInputs(value: unknown): RuntimeFileInput[] {
  if (Array.isArray(value)) return value.flatMap(normalizeFileInputs);
  if (value === undefined || value === null || value === "") return [];
  if (typeof value === "string") return [value];
  if (typeof value === "object") return [value as Record<string, any>];
  return [String(value)];
}

function normalizeMetadata(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function buildFileDatasetMetadata(
  source: Record<string, any>,
  data: Record<string, any>,
  custom: Record<string, any>,
): Record<string, any> {
  return {
    source,
    ...(Object.keys(data).length > 0 ? { data } : {}),
    ...(Object.keys(custom).length > 0 ? { custom } : {}),
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolveFileDatasetFormat(
  format: FileDatasetNode["format"],
  filename?: string,
  mimeType?: string,
): FileDatasetNode["format"] {
  if (format !== "auto") return format;
  const lowerFilename = filename?.toLowerCase() ?? "";
  const lowerMimeType = mimeType?.toLowerCase() ?? "";
  if (lowerMimeType.includes("csv") || lowerFilename.endsWith(".csv")) return "csv";
  if (lowerMimeType.includes("json") || lowerFilename.endsWith(".json")) return "json";
  if (
    lowerMimeType.includes("markdown") ||
    lowerFilename.endsWith(".md") ||
    lowerFilename.endsWith(".markdown")
  ) return "markdown";
  return "txt";
}

function csvToItems(
  value: string,
  idPrefix: string,
  sourceMetadata: Record<string, any>,
  customMetadata: Record<string, any>,
): DatasetOutput["items"] {
  const rows = parseCsv(value.trim());
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row, index) => {
      const record = Object.fromEntries(headers.map((header, cellIndex) => [header, row[cellIndex] ?? ""]));
      return {
        id: `${idPrefix}:${index}`,
        text: headers
          .map((header) => `${header}: ${record[header] ?? ""}`)
          .filter((line) => !line.endsWith(": "))
          .join("\n"),
        metadata: buildFileDatasetMetadata(
          {
            ...sourceMetadata,
            rowIndex: index,
          },
          record,
          customMetadata,
        ),
        raw: record,
      };
    });
}

function parseCsv(value: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.length > 1 || row[0].length > 0) rows.push(row);
  return rows;
}

function decodeFileContent(content: unknown): string {
  if (Buffer.isBuffer(content)) return content.toString("utf8");
  if (content === undefined || content === null) return "";
  if (typeof content !== "string") return String(content);
  const encoded = content.includes(",") ? content.slice(content.indexOf(",") + 1) : content;
  return looksBase64(encoded)
    ? Buffer.from(encoded, "base64").toString("utf8")
    : content;
}

function looksBase64(value: string): boolean {
  const normalized = value.trim();
  return normalized.length > 0 &&
    normalized.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(normalized);
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
  const dependencies = services.resolveConfigDependencies
    ? await services.resolveConfigDependencies(nodeId)
    : await new ConfigDependencyResolver(createCoreCapabilityAdapterRegistry()).resolveForNode(input, nodeId);
  const embedding = dependencies.getOne<EmbeddingModelRef>("embedding");
  const documentSources = dependencies.getMany<DocumentSourceRef>("document");
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
  const storeRef: VectorStoreRef = {
    providerId: node.pluginId,
    methods: { ensureCollection: node.ensureCollectionMethodId, upsertDocuments: node.upsertMethodId, querySimilar: node.queryMethodId },
    configuration: store,
    embedding,
  };
  const mode = node.retrievalMode ?? "index-and-query";
  const query = node.query
    ? String(TemplateEngine.evaluate(node.query, context)).trim()
    : "";
  const shouldIndex = mode !== "query" && documentSources.length > 0;
  const shouldQuery = mode !== "index" && Boolean(query);
  if (!shouldIndex && !shouldQuery) return baseOutput;
  if (!services.executePluginMethod) throw new Error("Vector Store requires plugin execution services.");
  const embeddingService = new EmbeddingExecutionService(async (pluginId, methodId, params) => {
    if (!embedding.nodeId) return services.executePluginMethod!(pluginId, methodId, params);

    const embeddingNode = workflow.nodes[embedding.nodeId];
    services.emitNodeStart?.(embedding.nodeId);
    try {
      const result = await services.executePluginMethod!(pluginId, methodId, params);
      services.emitNodeSuccess?.(embedding.nodeId, result, embeddingNode);
      return result;
    } catch (error) {
      services.emitNodeFailure?.(embedding.nodeId, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  });
  const vectorStoreService = new VectorStoreExecutionService(services.executePluginMethod, embeddingService);
  const output: Record<string, any> = { ...baseOutput };
  if (shouldIndex) {
    const loaded = await Promise.all(documentSources.map((source) => source.load()));
    const items = loaded.flatMap((datasetOutput) => Array.isArray(datasetOutput?.items) ? datasetOutput.items : []);
    Object.assign(output, await vectorStoreService.index(storeRef, items));
  }

  if (shouldQuery) {
    const result = await vectorStoreService.query(storeRef, { query, topK: node.topK ?? 5, filter: node.filter, maxContextChars: node.maxContextChars });
    output.items = result.documents.map((document) => ({ id: document.id, text: document.content, score: document.score, metadata: document.metadata }));
    if ((node.outputMode ?? "context") === "context") output.context = result.context;
    output.metadata = result.metadata;
  }

  return output;
}, {
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
