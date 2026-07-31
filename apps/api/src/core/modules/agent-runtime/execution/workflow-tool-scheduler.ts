import type { AgentEngineRequestRepository } from "../engine-protocol/agent-engine-request-repository.ts";
import type { AgentEngineResponseRepository } from "../engine-protocol/agent-engine-response-repository.ts";
import type { AgentEngineToolRequest } from "../engine-protocol/agent-engine-request.ts";
import type { AgentEngineResponse } from "../engine-protocol/agent-engine-response.ts";
import type { WorkflowNode } from "../../../../shared/models/workflow-types.ts";
import { randomUUID } from "node:crypto";

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
    request: AgentEngineToolRequest,
    signal?: AbortSignal,
  ): Promise<AgentEngineResponse> {
    const queued = this.enqueue(request);
    const existingResponse = this.responses.getByRequestId(queued.id);
    if (existingResponse) return existingResponse;

    const leased = queued.status === "queued"
      ? this.requests.updateStatus(queued.id, "leased")
      : queued;
    const executing = leased.status === "leased"
      ? this.requests.updateStatus(leased.id, "executing")
      : leased;
    if (executing.status !== "executing") {
      throw new Error(`Agent engine request is not executable: ${executing.status}`);
    }

    const target = this.resolver.resolve(executing.toolName);
    const output = await this.executor.execute(target, executing.arguments, signal);
    const response = this.responses.create({
      id: `response_${randomUUID()}`,
      requestId: executing.id,
      runId: executing.runId,
      toolCallId: executing.toolCallId,
      status: "succeeded",
      output,
      createdAt: new Date().toISOString(),
    });
    this.requests.updateStatus(executing.id, "completed");
    return response;
  }
}
