import type { EmbeddingModelRef } from "./ai-service-types.ts";

type ExecutePluginMethod = (pluginId: string, methodId: string, params: Record<string, any>) => Promise<any>;

export class EmbeddingExecutionService {
  private readonly executePluginMethod: ExecutePluginMethod;
  constructor(executePluginMethod: ExecutePluginMethod) { this.executePluginMethod = executePluginMethod; }

  async embedMany(model: EmbeddingModelRef, values: string[]): Promise<number[][]> {
    const result = await this.executePluginMethod(model.providerId, model.methodId, {
      ...model.configuration,
      input: values,
    });
    const vectors = Array.isArray(result) ? result
      : Array.isArray(result?.vectors) ? result.vectors
      : Array.isArray(result?.embeddings) ? result.embeddings
      : Array.isArray(result?.data) ? result.data.map((item: any) => item?.embedding ?? item?.vector)
      : [];
    return vectors.filter((value: unknown): value is number[] => Array.isArray(value));
  }
}
