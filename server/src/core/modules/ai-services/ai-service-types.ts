import type { AgentToolConfig, AiMemoryNodeConfig, AiModelNodeConfig } from "../agent-runtime/agent-types.ts";
import type { VectorDistanceMetric } from "../../../shared/models/workflow-types.ts";

export interface ChatModelRef {
  providerId: string;
  methodId?: string;
  configuration: AiModelNodeConfig;
}

export interface EmbeddingModelRef {
  providerId: string;
  methodId: string;
  configuration: Record<string, any>;
}

export interface VectorStoreRef {
  providerId: string;
  methods: { ensureCollection: string; upsertDocuments?: string; querySimilar: string };
  configuration: { collectionName: string; dimension: number; metric: VectorDistanceMetric; config: Record<string, any> };
  embedding: EmbeddingModelRef;
}

export interface RetrievedDocument { id?: string; content: string; score?: number; metadata?: Record<string, any> }
export interface RetrievalResult { query: string; documents: RetrievedDocument[]; context: string; metadata?: Record<string, any> }
export interface RetrieverRef { retrieve(query: string): Promise<RetrievalResult> }
export interface OutputParserRef { parse(value: string): Promise<unknown> }
export type MemoryRef = AiMemoryNodeConfig;
export type AgentToolRef = AgentToolConfig;
export interface DocumentSourceRef { load(): Promise<any> }
