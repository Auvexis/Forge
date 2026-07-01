import type { RetrievalResult, VectorStoreRef } from "./ai-service-types.ts";
import { EmbeddingExecutionService } from "./embedding-execution-service.ts";
import { VectorStoreExecutionService } from "./vector-store-execution-service.ts";

type ExecutePluginMethod = (pluginId: string, methodId: string, params: Record<string, any>) => Promise<any>;

export interface RetrieverRequest {
  query: string;
  topK: number;
  scoreThreshold?: number;
  filter?: Record<string, unknown>;
  maxContextChars?: number;
}

export class RetrieverExecutionService {
  private readonly vectorStores: VectorStoreExecutionService;

  constructor(executePluginMethod: ExecutePluginMethod) {
    this.vectorStores = new VectorStoreExecutionService(
      executePluginMethod,
      new EmbeddingExecutionService(executePluginMethod),
    );
  }

  async retrieve(store: VectorStoreRef, request: RetrieverRequest): Promise<RetrievalResult> {
    const result = await this.vectorStores.query(store, {
      query: request.query,
      topK: request.topK,
      scoreThreshold: request.scoreThreshold,
      filter: request.filter,
    });
    const documents = result.documents
      .filter((document) => request.scoreThreshold === undefined || (document.score !== undefined && document.score >= request.scoreThreshold))
      .slice(0, request.topK);
    const context = documents
      .map((document) => document.content)
      .join("\n\n")
      .slice(0, request.maxContextChars ?? 8000);

    return {
      query: request.query,
      documents,
      context,
      metadata: {
        ...result.metadata,
        topK: request.topK,
        documentCount: documents.length,
      },
    };
  }
}
