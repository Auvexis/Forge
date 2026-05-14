import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";
import { InMemoryExecutionQueue } from "./execution-queue.ts";
import { WorkflowJobRunner } from "./workflow-job-runner.ts";
import {
  assertValidSessionTransition,
  type DevWorkflowSession,
  type SessionEvent,
  type WorkflowJob,
  type WorkflowJobSource,
} from "./types.ts";

export interface EnqueueDevWorkflowJobInput {
  triggerNodeId: string;
  source: WorkflowJobSource;
  payload: unknown;
}

export interface DevWorkflowSessionManagerOptions {
  maxConcurrentPerSession?: number;
  maxConcurrentGlobal?: number;
  createId?: (prefix: "session" | "job" | "exec") => string;
  runWorkflowJob?: (job: WorkflowJob, workflow: WorkflowItem) => Promise<void>;
  onEvent?: (event: SessionEvent) => void;
}

function defaultCreateId(prefix: "session" | "job" | "exec"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class DevWorkflowSessionManager {
  private readonly sessions = new Map<string, DevWorkflowSession>();
  private readonly stopping = new Set<string>();
  private readonly createIdFn: NonNullable<DevWorkflowSessionManagerOptions["createId"]>;
  private readonly runner: WorkflowJobRunner;
  private readonly queue: InMemoryExecutionQueue;
  private readonly runWorkflowJob?: DevWorkflowSessionManagerOptions["runWorkflowJob"];
  private readonly options: DevWorkflowSessionManagerOptions;

  constructor(options: DevWorkflowSessionManagerOptions = {}) {
    this.options = options;
    this.createIdFn = options.createId ?? defaultCreateId;
    this.runWorkflowJob = options.runWorkflowJob;
    this.runner = new WorkflowJobRunner({
      createId: (prefix) => this.createIdFn(prefix),
    });
    this.queue = new InMemoryExecutionQueue({
      maxConcurrentPerSession: options.maxConcurrentPerSession ?? 2,
      maxConcurrentGlobal: options.maxConcurrentGlobal ?? 8,
      onEvent: options.onEvent,
      runJob: async (job) => {
        const session = this.sessions.get(job.sessionId);
        if (!session) return;
        if (this.runWorkflowJob) {
          await this.runWorkflowJob(job, session.workflow);
          return;
        }
        await this.runner.run(job, session.workflow);
      },
    });
  }

  createSession(workflow: WorkflowItem): DevWorkflowSession {
    const now = Date.now();
    const session: DevWorkflowSession = {
      id: this.createIdFn("session"),
      workflowId: workflow.metadata.id,
      workflow,
      status: "starting",
      createdAt: now,
      updatedAt: now,
      triggerRuntimes: [],
    };

    this.sessions.set(session.id, session);
    this.transition(session, "running");
    return session;
  }

  getSession(sessionId: string): DevWorkflowSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  enqueueJob(sessionId: string, input: EnqueueDevWorkflowJobInput): WorkflowJob {
    const session = this.requireSession(sessionId);
    if (session.status === "stopping" || session.status === "stopped") {
      throw new Error(`Cannot enqueue job for ${session.status} session ${sessionId}`);
    }

    const job = this.runner.createJob({
      sessionId,
      workflowId: session.workflowId,
      triggerNodeId: input.triggerNodeId,
      source: input.source,
      payload: input.payload,
    });
    return this.queue.enqueue(job);
  }

  async stopSession(sessionId: string, reason: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || this.stopping.has(sessionId)) return;

    this.stopping.add(sessionId);
    try {
      this.transition(session, "stopping");
      session.stopReason = reason;
      for (const runtime of session.triggerRuntimes.splice(0)) {
        await runtime.teardown();
      }
      this.queue.stopSession(sessionId);
      this.transition(session, "stopped");
      session.stoppedAt = Date.now();
      this.sessions.delete(sessionId);
    } finally {
      this.stopping.delete(sessionId);
    }
  }

  onIdle(): Promise<void> {
    return this.queue.onIdle();
  }

  private transition(
    session: DevWorkflowSession,
    status: DevWorkflowSession["status"],
  ): void {
    assertValidSessionTransition(session.status, status);
    session.status = status;
    session.updatedAt = Date.now();
  }

  private requireSession(sessionId: string): DevWorkflowSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Dev workflow session ${sessionId} was not found`);
    return session;
  }
}
