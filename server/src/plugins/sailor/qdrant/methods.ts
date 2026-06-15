import { createHash } from "node:crypto";

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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSIGNED_INTEGER_PATTERN = /^(0|[1-9]\d*)$/;

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
      try {
        await qdrantRequest(fetchImpl, config, `/collections/${encodeURIComponent(config.collectionName)}`, {
          method: "PUT",
          body: JSON.stringify({
            vectors: {
              size: params.store.dimension,
              distance: toQdrantDistance(params.store.metric),
            },
          }),
        });
      } catch (error) {
        if (!isQdrantCollectionAlreadyExistsError(error)) throw error;
      }

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
              id: toQdrantPointId(document.id),
              vector: document.vector,
              payload: {
                ...document.metadata,
                documentId: String(document.id),
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
        const documentId = typeof payload.documentId === "string" && payload.documentId
          ? payload.documentId
          : String(point.id);
        delete payload.text;
        return {
          id: documentId,
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

function toQdrantPointId(id: unknown): string | number {
  if (typeof id === "number" && Number.isSafeInteger(id) && id >= 0) return id;

  const value = String(id ?? "").trim();
  if (UNSIGNED_INTEGER_PATTERN.test(value)) return Number(value);
  if (UUID_PATTERN.test(value)) return value;

  return deterministicUuid(value || "document");
}

function deterministicUuid(value: string): string {
  const hex = createHash("sha256").update(value).digest("hex");
  const variant = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

function isQdrantCollectionAlreadyExistsError(error: unknown): boolean {
  return error instanceof Error
    && error.message.includes("Qdrant request failed (409)")
    && error.message.toLowerCase().includes("already exists");
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
