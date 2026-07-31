import type { AgentSideEffectService } from "../idempotency/agent-side-effect-service.ts";
import type { AgentEngineToolRequest } from "../engine-protocol/agent-engine-request.ts";
import type { AgentWorkflowExecutionGuard } from "./workflow-tool-scheduler.ts";

export class SideEffectExecutionGuard implements AgentWorkflowExecutionGuard {
  constructor(
    private readonly profileId: string,
    private readonly sideEffects: AgentSideEffectService,
    private readonly leaseMs = 35_000,
  ) {}

  execute(
    request: AgentEngineToolRequest,
    invoke: () => Promise<unknown>,
  ): Promise<unknown> {
    return this.sideEffects.execute({
      profileId: this.profileId,
      runId: request.runId,
      actionId: request.actionId,
      toolName: request.toolName,
      arguments: request.arguments,
      leaseMs: this.leaseMs,
      invoke,
    });
  }
}
