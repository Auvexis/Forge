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
type QdrantMode = "local" | "cloud" | "self-hosted";

interface QdrantConfig {
  mode: QdrantMode;
  url: string;
  collectionName: string;
  apiKey?: string;
  preferGrpc: boolean;
  tls: boolean;
  timeoutMs: number;
}

export function normalizeQdrantConfig(
  store: VectorStoreProviderConfig,
  context?: PluginContext,
): QdrantConfig {
  const config = store.config ?? {};
  const mode = config.mode === "cloud" || config.mode === "self-hosted" ? config.mode : "local";
  const url = String(config.url).replace(/\/+$/, "");

  if (!url || url === "undefined") throw new Error("Qdrant url is required.");
  if (!store.collectionName) throw new Error("Qdrant collectionName is required.");
  if (!Number.isFinite(store.dimension) || store.dimension < 1) {
    throw new Error("Qdrant dimension must be >= 1.");
  }

  const apiKey = context?.credentials?.apiKey;
  if (mode === "cloud" && !apiKey) {
    throw new Error("Qdrant Cloud requires apiKey credential.");
  }

  return {
    mode,
    url,
    collectionName: store.collectionName,
    apiKey,
    preferGrpc: config.preferGrpc === true,
    tls: config.tls === true,
    timeoutMs: normalizeTimeout(config.timeoutMs),
  };
}

export function createQdrantMethods(fetchImpl: FetchLike = fetch) {
  return {
    async ensureCollection(params: VectorStoreEnsureCollectionInput, context?: PluginContext) {
      const config = normalizeQdrantConfig(params.store, context);
      await qdrantRequest(fetchImpl, config, `/collections/${encodeURIComponent(config.collectionName)}`, {
        method: "PUT",
        body: JSON.stringify({
          vectors: {
            size: params.store.dimension,
            distance: toQdrantDistance(params.store.metric),
          },
        }),
      });

      return { ok: true, collectionName: config.collectionName };
    },

    async upsertDocuments(params: VectorStoreUpsertDocumentsInput, context?: PluginContext) {
      const config = normalizeQdrantConfig(params.store, context);
      await qdrantRequest(
        fetchImpl,
        config,
        `/collections/${encodeURIComponent(config.collectionName)}/points?wait=true`,
        {
          method: "PUT",
          body: JSON.stringify({
            points: params.documents.map((document) => ({
              id: document.id,
              vector: document.vector,
              payload: {
                ...document.metadata,
                text: document.text,
              },
            })),
          }),
        },
      );

      return { upsertedCount: params.documents.length };
    },

    async querySimilar(params: VectorStoreQuerySimilarInput, context?: PluginContext): Promise<VectorSearchResult[]> {
      const config = normalizeQdrantConfig(params.store, context);
      if (!params.query.vector) throw new Error("Qdrant querySimilar requires query.vector.");

      const response = await qdrantRequest(
        fetchImpl,
        config,
        `/collections/${encodeURIComponent(config.collectionName)}/points/search`,
        {
          method: "POST",
          body: JSON.stringify({
            vector: params.query.vector,
            limit: params.query.topK,
            filter: params.query.filter,
            with_payload: true,
          }),
        },
      );

      return (Array.isArray(response.result) ? response.result : []).map((point: any) => {
        const payload = { ...(point.payload ?? {}) };
        const text = typeof payload.text === "string" ? payload.text : "";
        delete payload.text;
        return {
          id: String(point.id),
          score: Number(point.score ?? 0),
          text,
          metadata: payload,
        };
      });
    },

    async deleteDocuments(params: VectorStoreDeleteDocumentsInput, context?: PluginContext) {
      const config = normalizeQdrantConfig(params.store, context);
      await qdrantRequest(
        fetchImpl,
        config,
        `/collections/${encodeURIComponent(config.collectionName)}/points/delete?wait=true`,
        {
          method: "POST",
          body: JSON.stringify({ points: params.ids }),
        },
      );

      return { ok: true, deletedCount: params.ids.length };
    },

    async describeCollection(params: VectorStoreDescribeCollectionInput, context?: PluginContext) {
      const config = normalizeQdrantConfig(params.store, context);
      return qdrantRequest(fetchImpl, config, `/collections/${encodeURIComponent(config.collectionName)}`, {
        method: "GET",
      });
    },
  };
}

function toQdrantDistance(metric: VectorStoreProviderConfig["metric"]): "Cosine" | "Dot" | "Euclid" {
  if (metric === "dot") return "Dot";
  if (metric === "euclidean") return "Euclid";
  return "Cosine";
}

function normalizeTimeout(value: unknown): number {
  const parsed = Number(value ?? 30000);
  if (!Number.isFinite(parsed) || parsed < 1000) return 30000;
  return Math.trunc(parsed);
}

async function qdrantRequest(
  fetchImpl: FetchLike,
  config: QdrantConfig,
  path: string,
  init: RequestInit,
): Promise<any> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (config.apiKey) headers["api-key"] = config.apiKey;

  const response = await fetchImpl(`${config.url}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`Qdrant request failed (${response.status}): ${text}`);
  }

  return body;
}
