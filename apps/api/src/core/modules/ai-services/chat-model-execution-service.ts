import type { ChatModelRef } from "./ai-service-types.ts";
import { AgentModelProviderRegistry } from "../agent-runtime/model-provider-registry.ts";

export class ChatModelExecutionService {
  private readonly invokeModel?: (model: ChatModelRef, request: Record<string, any>) => Promise<any>;
  private readonly modelRegistry: AgentModelProviderRegistry;

  constructor(
    invokeModel?: (model: ChatModelRef, request: Record<string, any>) => Promise<any>,
    modelRegistry = new AgentModelProviderRegistry(),
  ) {
    this.invokeModel = invokeModel;
    this.modelRegistry = modelRegistry;
  }

  async invoke(model: ChatModelRef, request: Record<string, any>): Promise<any> {
    if (this.invokeModel) return this.invokeModel(model, request);
    const chatModel = await this.modelRegistry.createChatModel(model.configuration) as {
      invoke(messages: unknown[]): Promise<unknown>;
    };
    return chatModel.invoke(Array.isArray(request.messages) ? request.messages : []);
  }
}
