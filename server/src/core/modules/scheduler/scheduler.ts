import cron from "node-cron";
import { WorkflowRepository } from "../workflows/repository.ts";
import { WorkflowEngine } from "../workflows/executor.ts";
import { listCronTriggers } from "../workflows/workflow-triggers.ts";

// ──────────── Types ────────────

interface ScheduledJob {
  workflowId: string;
  triggerNodeId: string;
  cronExpression: string;
  task: cron.ScheduledTask;
}

// ──────────── Active Jobs Registry ────────────

const activeJobs = new Map<string, ScheduledJob>();

// ──────────── Scheduler ────────────

export const Scheduler = {
  /**
   * Initialize all cron jobs from active, non-draft workflows.
   * Called once at server startup after plugins are loaded.
   */
  initialize(): void {
    const workflows = WorkflowRepository.getActiveWorkflows();
    let count = 0;

    for (const resolved of listCronTriggers(workflows)) {
      this.scheduleWorkflow(
        resolved.workflow.metadata.id,
        resolved.triggerNodeId,
        resolved.entry.trigger.cronExpression!,
      );
      count++;
    }

    if (count > 0) {
      console.log(`[SAILOR | SCHEDULER]: Initialized ${count} cron job(s)`);
    }
  },

  /**
   * Schedule a single workflow by its ID and cron expression.
   * If the workflow already has a job, it will be replaced.
   */
  scheduleWorkflow(workflowId: string, triggerNodeId: string, cronExpression: string): void {
    if (!cron.validate(cronExpression)) {
      console.error(
        `[SAILOR | SCHEDULER]: Invalid cron expression for workflow ${workflowId}: "${cronExpression}"`,
      );
      return;
    }

    // Remove existing job for this workflow before re-scheduling
    this.unscheduleWorkflow(workflowId, triggerNodeId);

    const task = cron.schedule(cronExpression, async () => {
      console.log(`[SAILOR | SCHEDULER]: Triggering workflow ${workflowId}/${triggerNodeId} (cron: ${cronExpression})`);

      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        console.error(
          `[SAILOR | SCHEDULER]: Workflow ${workflowId} not found — removing job`,
        );
        this.unscheduleWorkflow(workflowId, triggerNodeId);
        return;
      }

      const triggerPayload = {
        scheduledAt: new Date().toISOString(),
        cronExpression,
        triggerType: "cron",
        triggerNodeId,
      };

      const executionId = `exec_cron_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      try {
        await WorkflowEngine.executeWorkflowFromTrigger(
          workflow,
          triggerNodeId,
          triggerPayload,
          executionId,
        );
        console.log(`[SAILOR | SCHEDULER]: Workflow ${workflowId} completed`);
      } catch (err: any) {
        console.error(
          `[SAILOR | SCHEDULER]: Workflow ${workflowId} failed: ${err.message}`,
        );
      }
    });

    const jobId = schedulerJobId(workflowId, triggerNodeId);
    activeJobs.set(jobId, { workflowId, triggerNodeId, cronExpression, task });
    console.log(
      `[SAILOR | SCHEDULER]: Scheduled workflow ${workflowId} (${cronExpression})`,
    );
  },

  /**
   * Stop and remove the scheduled job for a workflow.
   */
  unscheduleWorkflow(workflowId: string, triggerNodeId = "trigger"): void {
    const job = activeJobs.get(schedulerJobId(workflowId, triggerNodeId));
    if (job) {
      job.task.stop();
      activeJobs.delete(schedulerJobId(workflowId, triggerNodeId));
    }
  },

  /**
   * Re-scan all active workflows and rebuild the job registry.
   * Call this after any workflow is saved, updated, or deleted.
   */
  resync(): void {
    // Stop all current jobs
    for (const [, job] of activeJobs) {
      job.task.stop();
    }
    activeJobs.clear();

    // Re-initialize from current DB state
    this.initialize();
  },

  /**
   * Returns the IDs of all currently scheduled workflows.
   */
  getActiveJobs(): string[] {
    return Array.from(activeJobs.keys());
  },
};

function schedulerJobId(workflowId: string, triggerNodeId: string): string {
  return `${workflowId}:${triggerNodeId}`;
}
