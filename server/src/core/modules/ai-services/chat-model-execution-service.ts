import type { ChatModelRef } from "./ai-service-types.ts";

export class ChatModelExecutionService {
  private readonly invokeModel: (model: ChatModelRef, request: Record<string, any>) => Promise<any>;
  constructor(invokeModel: (model: ChatModelRef, request: Record<string, any>) => Promise<any>) { this.invokeModel = invokeModel; }
  invoke(model: ChatModelRef, request: Record<string, any>): Promise<any> { return this.invokeModel(model, request); }
}
