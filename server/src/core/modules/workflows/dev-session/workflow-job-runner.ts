import { CancellationRegistry } from "../cancellation-registry.ts";
import { WorkflowEngine } from "../executor.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";
import type { WorkflowJob, WorkflowJobSource } from "./types.ts";

export interface CreateWorkflowJobInput {
  sessionId: string;
  workflowId: string;
  triggerNodeId: string;
  source: WorkflowJobSource;
  payload: unknown;
}

export interface WorkflowJobRunnerOptions {
  executeWorkflowFromTrigger?: (
    workflow: WorkflowItem,
    triggerNodeId: string,
    triggerPayload: unknown,
    executionId: string,
  ) => Promise<unknown>;
  cancelExecution?: (executionId: string) => void;
  createId?: (prefix: "job" | "exec") => string;
}

function defaultCreateId(prefix: "job" | "exec"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class WorkflowJobRunner {
  private readonly executeWorkflowFromTrigger: NonNullable<
    WorkflowJobRunnerOptions["executeWorkflowFromTrigger"]
  >;
  private readonly cancelExecution: NonNullable<WorkflowJobRunnerOptions["cancelExecution"]>;
  private readonly createIdFn: NonNullable<WorkflowJobRunnerOptions["createId"]>;

  constructor(options: WorkflowJobRunnerOptions = {}) {
    this.executeWorkflowFromTrigger =
      options.executeWorkflowFromTrigger ??
      ((workflow, triggerNodeId, triggerPayload, executionId) =>
        WorkflowEngine.executeWorkflowFromTrigger(
          workflow,
          triggerNodeId,
          triggerPayload,
          executionId,
        ));
    this.cancelExecution = options.cancelExecution ?? CancellationRegistry.cancel;
    this.createIdFn = options.createId ?? defaultCreateId;
  }

  createJob(input: CreateWorkflowJobInput): WorkflowJob {
    return {
      id: this.createIdFn("job"),
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      triggerNodeId: input.triggerNodeId,
      executionId: this.createIdFn("exec"),
      status: "queued",
      source: input.source,
      payload: input.payload,
      queuedAt: Date.now(),
    };
  }

  async run(job: WorkflowJob, workflow: WorkflowItem): Promise<unknown> {
    return this.executeWorkflowFromTrigger(
      workflow,
      job.triggerNodeId,
      job.payload,
      job.executionId,
    );
  }

  cancel(job: WorkflowJob): void {
    this.cancelExecution(job.executionId);
  }
}
