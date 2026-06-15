import type { PluginContext } from "@auvexis/sailor-sdk";
import type {
  VectorSearchResult,
  VectorStoreDeleteDocumentsInput,
  VectorStoreDescribeCollectionInput,
  VectorStoreEnsureCollectionInput,
  VectorStoreProviderConfig,
  VectorStoreQuerySimilarInput,
  VectorStoreUpsertDocumentsInput,
} from "../../../shared/models/workflow-types.ts";

type FetchLike = typeof fetch;
type PineconeMode = "local" | "cloud";

interface PineconeConfig {
  mode: PineconeMode;
  endpoint: string;
  namespace?: string;
  apiKey?: string;
}

export function normalizePineconeConfig(
  store: VectorStoreProviderConfig,
  context?: PluginContext,
): PineconeConfig {
  const config = store.config ?? {};
  const mode = config.mode === "local" ? "local" : "cloud";
  const endpoint = String(mode === "local" ? config.localHost : config.host).replace(/\/+$/, "");

  if (!endpoint || endpoint === "undefined") {
    throw new Error(mode === "local" ? "Pinecone localHost is required." : "Pinecone host is required.");
  }
  if (!store.collectionName) throw new Error("Pinecone collectionName is required.");
  if (!Number.isFinite(store.dimension) || store.dimension < 1) {
    throw new Error("Pinecone dimension must be >= 1.");
  }

  const apiKey = context?.credentials?.apiKey;
  if (mode === "cloud" && !apiKey) {
    throw new Error("Pinecone Cloud requires apiKey credential.");
  }

  return {
    mode,
    endpoint,
    namespace: typeof config.namespace === "string" && config.namespace.trim()
      ? config.namespace.trim()
      : undefined,
    apiKey,
  };
}

export function createPineconeMethods(fetchImpl: FetchLike = fetch) {
  return {
    async ensureCollection(params: VectorStoreEnsureCollectionInput, context?: PluginContext) {
      const config = normalizePineconeConfig(params.store, context);
      return {
        ok: true,
        provider: "pinecone",
        mode: config.mode,
        collectionName: params.store.collectionName,
        dimension: params.store.dimension,
        metric: params.store.metric,
      };
    },

    async upsertDocuments(params: VectorStoreUpsertDocumentsInput, context?: PluginContext) {
      const config = normalizePineconeConfig(params.store, context);
      const response = await pineconeRequest(fetchImpl, config, "/vectors/upsert", {
        method: "POST",
        body: JSON.stringify({
          namespace: config.namespace,
          vectors: params.documents.map((document) => ({
            id: document.id,
            values: document.vector,
            metadata: {
              ...flattenMetadata(document.metadata),
              documentId: String(document.id),
              text: document.text,
            },
          })),
        }),
      });

      return {
        upsertedCount: Number(response.upsertedCount ?? params.documents.length),
      };
    },

    async querySimilar(params: VectorStoreQuerySimilarInput, context?: PluginContext): Promise<VectorSearchResult[]> {
      const config = normalizePineconeConfig(params.store, context);
      if (!params.query.vector) throw new Error("Pinecone querySimilar requires query.vector.");

      const response = await pineconeRequest(fetchImpl, config, "/query", {
        method: "POST",
        body: JSON.stringify({
          namespace: config.namespace,
          vector: params.query.vector,
          topK: params.query.topK,
          filter: params.query.filter,
          includeMetadata: true,
        }),
      });

      return (Array.isArray(response.matches) ? response.matches : []).map((match: any) => {
        const metadata = { ...(match.metadata ?? {}) };
        const text = typeof metadata.text === "string" ? metadata.text : "";
        const documentId = typeof metadata.documentId === "string" && metadata.documentId
          ? metadata.documentId
          : String(match.id);
        delete metadata.text;
        return {
          id: documentId,
          score: Number(match.score ?? 0),
          text,
          metadata,
        };
      });
    },

    async deleteDocuments(params: VectorStoreDeleteDocumentsInput, context?: PluginContext) {
      const config = normalizePineconeConfig(params.store, context);
      await pineconeRequest(fetchImpl, config, "/vectors/delete", {
        method: "POST",
        body: JSON.stringify({
          namespace: config.namespace,
          ids: params.ids,
        }),
      });
      return { ok: true, deletedCount: params.ids.length };
    },

    async describeCollection(params: VectorStoreDescribeCollectionInput, context?: PluginContext) {
      const config = normalizePineconeConfig(params.store, context);
      return pineconeRequest(fetchImpl, config, "/describe_index_stats", { method: "POST" });
    },
  };
}

async function pineconeRequest(
  fetchImpl: FetchLike,
  config: PineconeConfig,
  path: string,
  init: RequestInit,
): Promise<any> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (config.apiKey) headers["api-key"] = config.apiKey;

  const response = await fetchImpl(`${config.endpoint}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`Pinecone request failed (${response.status}): ${text}`);
  }

  return body;
}

function flattenMetadata(
  value: Record<string, any> | undefined,
  prefix = "",
): Record<string, string | number | boolean | string[]> {
  const result: Record<string, string | number | boolean | string[]> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;

  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (item === undefined || item === null) continue;
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      result[path] = item;
      continue;
    }
    if (Array.isArray(item) && item.every((entry) => typeof entry === "string")) {
      result[path] = item;
      continue;
    }
    if (typeof item === "object") {
      Object.assign(result, flattenMetadata(item as Record<string, any>, path));
    }
  }

  return result;
}
