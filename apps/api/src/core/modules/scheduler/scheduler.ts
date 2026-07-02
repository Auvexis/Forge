import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { WorkflowRepository } from "../workflows/repository.ts";
import { WorkflowEngine } from "../workflows/executor.ts";
import { listCronTriggers } from "../workflows/workflow-triggers.ts";

interface ScheduledJob {
  profileId: string | null;
  workflowId: string;
  triggerNodeId: string;
  cronExpression: string;
  task: ScheduledTask;
}

interface SchedulerProfileScope {
  listProfileIds(): string[];
  runWithProfile<T>(profileId: string, callback: () => T): T;
}

const activeJobs = new Map<string, ScheduledJob>();
let profileScope: SchedulerProfileScope | null = null;

export const Scheduler = {
  configureProfileScope(scope: SchedulerProfileScope): void {
    profileScope = scope;
  },

  resetProfileScope(): void {
    profileScope = null;
  },

  initialize(): void {
    let count = 0;

    if (profileScope) {
      for (const profileId of profileScope.listProfileIds()) {
        profileScope.runWithProfile(profileId, () => {
          const workflows = WorkflowRepository.getActiveWorkflows();
          for (const resolved of listCronTriggers(workflows)) {
            this.scheduleWorkflow(
              resolved.workflow.metadata.id,
              resolved.triggerNodeId,
              resolved.entry.trigger.cronExpression!,
              profileId,
            );
            count++;
          }
        });
      }
    } else {
      const workflows = WorkflowRepository.getActiveWorkflows();
      for (const resolved of listCronTriggers(workflows)) {
        this.scheduleWorkflow(
          resolved.workflow.metadata.id,
          resolved.triggerNodeId,
          resolved.entry.trigger.cronExpression!,
        );
        count++;
      }
    }

    if (count > 0) {
      console.log(`[SAILOR | SCHEDULER]: Initialized ${count} cron job(s)`);
    }
  },

  scheduleWorkflow(
    workflowId: string,
    triggerNodeId: string,
    cronExpression: string,
    profileId: string | null = null,
  ): void {
    if (!cron.validate(cronExpression)) {
      console.error(
        `[SAILOR | SCHEDULER]: Invalid cron expression for workflow ${workflowId}: "${cronExpression}"`,
      );
      return;
    }

    this.unscheduleWorkflow(workflowId, triggerNodeId, profileId);

    const task = cron.schedule(cronExpression, async () => {
      console.log(
        `[SAILOR | SCHEDULER]: Triggering workflow ${workflowId}/${triggerNodeId} (cron: ${cronExpression})`,
      );

      const run = async () => {
        const workflow = WorkflowRepository.getWorkflowById(workflowId);
        if (!workflow) {
          console.error(
            `[SAILOR | SCHEDULER]: Workflow ${workflowId} not found - removing job`,
          );
          this.unscheduleWorkflow(workflowId, triggerNodeId, profileId);
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
      };

      if (profileId && profileScope) {
        try {
          await profileScope.runWithProfile(profileId, run);
        } catch (err: any) {
          if (err?.message === `Profile '${profileId}' not found`) {
            console.warn(
              `[SAILOR | SCHEDULER]: Profile '${profileId}' not found - removing scheduled jobs`,
            );
            this.unscheduleProfile(profileId);
            return;
          }

          console.error(
            `[SAILOR | SCHEDULER]: Workflow ${workflowId} failed: ${err?.message ?? err}`,
          );
        }
        return;
      }

      await run();
    });

    const jobId = schedulerJobId(workflowId, triggerNodeId, profileId);
    activeJobs.set(jobId, {
      profileId,
      workflowId,
      triggerNodeId,
      cronExpression,
      task,
    });
    console.log(
      `[SAILOR | SCHEDULER]: Scheduled workflow ${workflowId} (${cronExpression})`,
    );
  },

  unscheduleWorkflow(
    workflowId: string,
    triggerNodeId = "trigger",
    profileId: string | null = null,
  ): void {
    const jobId = schedulerJobId(workflowId, triggerNodeId, profileId);
    const job = activeJobs.get(jobId);
    if (job) {
      job.task.stop();
      activeJobs.delete(jobId);
    }
  },

  unscheduleProfile(profileId: string): void {
    for (const [jobId, job] of activeJobs) {
      if (job.profileId !== profileId) continue;
      job.task.stop();
      activeJobs.delete(jobId);
    }
  },

  resync(): void {
    this.stopAll();
    this.initialize();
  },

  stopAll(): void {
    for (const [, job] of activeJobs) {
      job.task.stop();
    }
    activeJobs.clear();
  },

  getActiveJobs(): string[] {
    return Array.from(activeJobs.keys());
  },
};

function schedulerJobId(
  workflowId: string,
  triggerNodeId: string,
  profileId: string | null,
): string {
  return profileId
    ? `${profileId}:${workflowId}:${triggerNodeId}`
    : `${workflowId}:${triggerNodeId}`;
}
