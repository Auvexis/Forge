import type { AgentEngineRequestRepository } from "../engine-protocol/agent-engine-request-repository.ts";
import type { AgentEngineResponseRepository } from "../engine-protocol/agent-engine-response-repository.ts";
import type { AgentEngineToolRequest } from "../engine-protocol/agent-engine-request.ts";
import type { AgentEngineResponse } from "../engine-protocol/agent-engine-response.ts";
import type { WorkflowNode } from "../../../../shared/models/workflow-types.ts";

export interface AgentWorkflowToolTarget {
  nodeId: string;
  toolName: string;
  pluginId?: string;
  methodId?: string;
  node?: WorkflowNode;
}

export interface AgentWorkflowToolResolver {
  resolve(toolName: string): AgentWorkflowToolTarget;
}

export interface AgentWorkflowToolExecutor {
  execute(
    target: AgentWorkflowToolTarget,
    arguments_: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown>;
}

export class WorkflowToolScheduler {
  constructor(
    private readonly requests: AgentEngineRequestRepository,
    private readonly responses: AgentEngineResponseRepository,
    private readonly resolver: AgentWorkflowToolResolver,
    private readonly executor: AgentWorkflowToolExecutor,
  ) {}

  enqueue(request: AgentEngineToolRequest): AgentEngineToolRequest {
    const persisted = this.requests.createOrGet(request);
    if (persisted.kind !== "tool") {
      throw new Error(`Unsupported agent engine request kind: ${(persisted as any).kind}`);
    }
    return persisted;
  }

  async dispatch(
    _request: AgentEngineToolRequest,
    _signal?: AbortSignal,
  ): Promise<AgentEngineResponse> {
    void this.requests;
    void this.responses;
    void this.resolver;
    void this.executor;
    throw new Error("Workflow tool scheduler dispatch is not implemented");
  }
}
