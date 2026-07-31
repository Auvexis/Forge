import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";
import { WorkflowEngine } from "../../workflows/executor.ts";
import type {
  AgentWorkflowToolExecutor,
  AgentWorkflowToolTarget,
} from "./workflow-tool-scheduler.ts";

export class WorkflowEngineToolExecutor implements AgentWorkflowToolExecutor {
  constructor(
    private readonly workflow: WorkflowItem,
    private readonly executionId: string,
  ) {}

  execute(
    target: AgentWorkflowToolTarget,
    arguments_: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    return WorkflowEngine.executeAgentToolNode(
      this.workflow,
      target.nodeId,
      arguments_,
      this.executionId,
      signal,
    );
  }
}
