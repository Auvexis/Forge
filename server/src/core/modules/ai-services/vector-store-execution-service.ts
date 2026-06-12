import type { RetrievalResult, VectorStoreRef } from "./ai-service-types.ts";
import { EmbeddingExecutionService } from "./embedding-execution-service.ts";

type ExecutePluginMethod = (pluginId: string, methodId: string, params: Record<string, any>) => Promise<any>;

export class VectorStoreExecutionService {
  private readonly executePluginMethod: ExecutePluginMethod;
  private readonly embeddings: EmbeddingExecutionService;
  constructor(
    executePluginMethod: ExecutePluginMethod,
    embeddings: EmbeddingExecutionService,
  ) { this.executePluginMethod = executePluginMethod; this.embeddings = embeddings; }

  async query(store: VectorStoreRef, request: { query: string; topK: number; scoreThreshold?: number; filter?: Record<string, any>; maxContextChars?: number }): Promise<RetrievalResult> {
    const [vector] = await this.embeddings.embedMany(store.embedding, [request.query]);
    if (!vector) throw new Error("Embedding provider did not return a query vector.");
    await this.executePluginMethod(store.providerId, store.methods.ensureCollection, { store: store.configuration });
    const result = await this.executePluginMethod(store.providerId, store.methods.querySimilar, {
      store: store.configuration,
      query: { text: request.query, vector, topK: request.topK, scoreThreshold: request.scoreThreshold, filter: request.filter ?? {} },
    });
    const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
    const documents = items.map((item: any) => ({
      id: item?.id === undefined ? undefined : String(item.id),
      content: String(item?.text ?? item?.content ?? ""),
      score: typeof item?.score === "number" ? item.score : undefined,
      metadata: item?.metadata && typeof item.metadata === "object" ? item.metadata : {},
    })).filter((item: any) => item.content);
    const context = documents.map((item: any) => item.content).join("\n\n").slice(0, request.maxContextChars ?? 8000);
    return { query: request.query, documents, context, metadata: { providerId: store.providerId, topK: request.topK } };
  }

  async index(store: VectorStoreRef, items: any[]): Promise<{ indexedCount: number; documents: any[] }> {
    if (!store.methods.upsertDocuments) throw new Error("Vector Store does not define an upsert method.");
    const vectors = await this.embeddings.embedMany(store.embedding, items.map((item) => String(item?.text ?? "")));
    if (vectors.length !== items.length) throw new Error(`Embedding provider returned ${vectors.length} vectors for ${items.length} documents.`);
    const documents = items.map((item, index) => ({ id: String(item?.id ?? index), text: String(item?.text ?? ""), vector: vectors[index], metadata: item?.metadata ?? {} }));
    await this.executePluginMethod(store.providerId, store.methods.ensureCollection, { store: store.configuration });
    const result = await this.executePluginMethod(store.providerId, store.methods.upsertDocuments, { store: store.configuration, documents });
    return { indexedCount: Number(result?.upsertedCount ?? documents.length), documents };
  }
}
