import type { AgentEngineRequestRepository } from "../engine-protocol/agent-engine-request-repository.ts";
import type { AgentEngineResponse } from "../engine-protocol/agent-engine-response.ts";
import type { AgentPendingInteraction } from "../contracts/agent-domain-contracts.ts";
import type { AgentPendingInteractionRepository } from "../persistence/agent-pending-interaction-repository.ts";
import type { WorkflowToolScheduler } from "../execution/workflow-tool-scheduler.ts";

export interface AgentRecoveryReport {
  recoveredRequestIds: string[];
  failedRequestIds: string[];
  waitingInteractions: AgentPendingInteraction[];
}

export class AgentEngineRecoveryService {
  constructor(
    private readonly requests: AgentEngineRequestRepository,
    private readonly interactions: AgentPendingInteractionRepository,
    private readonly schedulerFactory: (runId: string) => WorkflowToolScheduler,
    private readonly onResponse?: (response: AgentEngineResponse) => Promise<void> | void,
    private readonly onRecoveryEvent?: (
      event: "recovery.started" | "recovery.completed" | "recovery.failed",
      data: Record<string, unknown>,
    ) => void,
  ) {}

  async recover(input: {
    now?: Date;
    limit?: number;
    signal?: AbortSignal;
  } = {}): Promise<AgentRecoveryReport> {
    const recoverable = this.requests.listRecoverable(input.now, input.limit);
    this.onRecoveryEvent?.("recovery.started", { requestCount: recoverable.length });
    const recoveredRequestIds: string[] = [];
    const failedRequestIds: string[] = [];
    for (const request of recoverable) {
      if (input.signal?.aborted) break;
      try {
        const response = await this.schedulerFactory(request.runId)
          .dispatch(request, input.signal);
        await this.onResponse?.(response);
        recoveredRequestIds.push(request.id);
        this.onRecoveryEvent?.("recovery.completed", {
          requestId: request.id,
          runId: request.runId,
          status: response.status,
        });
      } catch (error) {
        failedRequestIds.push(request.id);
        this.onRecoveryEvent?.("recovery.failed", {
          requestId: request.id,
          runId: request.runId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return {
      recoveredRequestIds,
      failedRequestIds,
      waitingInteractions: this.interactions.listPending(input.limit),
    };
  }
}
