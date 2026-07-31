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
  ) {}

  async recover(input: {
    now?: Date;
    limit?: number;
    signal?: AbortSignal;
  } = {}): Promise<AgentRecoveryReport> {
    const recoverable = this.requests.listRecoverable(input.now, input.limit);
    const recoveredRequestIds: string[] = [];
    const failedRequestIds: string[] = [];
    for (const request of recoverable) {
      if (input.signal?.aborted) break;
      try {
        const response = await this.schedulerFactory(request.runId)
          .dispatch(request, input.signal);
        await this.onResponse?.(response);
        recoveredRequestIds.push(request.id);
      } catch {
        failedRequestIds.push(request.id);
      }
    }
    return {
      recoveredRequestIds,
      failedRequestIds,
      waitingInteractions: this.interactions.listPending(input.limit),
    };
  }
}
