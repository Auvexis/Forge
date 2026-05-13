import cron from "node-cron";
import { WorkflowRepository } from "../workflows/repository.ts";
import { WorkflowEngine } from "../workflows/executor.ts";

// ──────────── Types ────────────

interface ScheduledJob {
  workflowId: string;
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

    for (const workflow of workflows) {
      if (workflow.trigger.type === "cron" && workflow.trigger.cronExpression) {
        this.scheduleWorkflow(workflow.metadata.id, workflow.trigger.cronExpression);
        count++;
      }
    }

    if (count > 0) {
      console.log(`[NOD8 | SCHEDULER]: Initialized ${count} cron job(s)`);
    }
  },

  /**
   * Schedule a single workflow by its ID and cron expression.
   * If the workflow already has a job, it will be replaced.
   */
  scheduleWorkflow(workflowId: string, cronExpression: string): void {
    if (!cron.validate(cronExpression)) {
      console.error(
        `[NOD8 | SCHEDULER]: Invalid cron expression for workflow ${workflowId}: "${cronExpression}"`,
      );
      return;
    }

    // Remove existing job for this workflow before re-scheduling
    this.unscheduleWorkflow(workflowId);

    const task = cron.schedule(cronExpression, async () => {
      console.log(`[NOD8 | SCHEDULER]: Triggering workflow ${workflowId} (cron: ${cronExpression})`);

      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        console.error(
          `[NOD8 | SCHEDULER]: Workflow ${workflowId} not found — removing job`,
        );
        this.unscheduleWorkflow(workflowId);
        return;
      }

      const triggerPayload = {
        scheduledAt: new Date().toISOString(),
        cronExpression,
        triggerType: "cron",
      };

      const executionId = `exec_cron_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      try {
        await WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId);
        console.log(`[NOD8 | SCHEDULER]: Workflow ${workflowId} completed`);
      } catch (err: any) {
        console.error(
          `[NOD8 | SCHEDULER]: Workflow ${workflowId} failed: ${err.message}`,
        );
      }
    });

    activeJobs.set(workflowId, { workflowId, cronExpression, task });
    console.log(
      `[NOD8 | SCHEDULER]: Scheduled workflow ${workflowId} (${cronExpression})`,
    );
  },

  /**
   * Stop and remove the scheduled job for a workflow.
   */
  unscheduleWorkflow(workflowId: string): void {
    const job = activeJobs.get(workflowId);
    if (job) {
      job.task.stop();
      activeJobs.delete(workflowId);
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
