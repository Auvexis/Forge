import type { SessionEvent, WorkflowJob } from "./types.ts";

export interface InMemoryExecutionQueueOptions {
  maxConcurrentPerSession: number;
  maxConcurrentGlobal: number;
  runJob: (job: WorkflowJob) => Promise<void>;
  onEvent?: (event: SessionEvent) => void;
}

interface SessionQueue {
  pending: WorkflowJob[];
  running: number;
  stopped: boolean;
}

export class InMemoryExecutionQueue {
  private readonly sessions = new Map<string, SessionQueue>();
  private readonly idleResolvers: Array<() => void> = [];
  private readonly options: InMemoryExecutionQueueOptions;
  private runningGlobal = 0;

  constructor(options: InMemoryExecutionQueueOptions) {
    this.options = options;
  }

  enqueue(job: WorkflowJob): WorkflowJob {
    const session = this.getSession(job.sessionId);
    if (session.stopped) {
      throw new Error(`Cannot enqueue job for stopped session ${job.sessionId}`);
    }

    session.pending.push(job);
    this.emit(job, "job:queued");
    this.drain();
    return job;
  }

  stopSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    session.stopped = true;
    this.cancelPending(sessionId);
    this.resolveIdleIfNeeded();
  }

  cancelPending(sessionId: string): WorkflowJob[] {
    const session = this.getSession(sessionId);
    const cancelled = session.pending.splice(0);

    for (const job of cancelled) {
      job.status = "cancelled";
      job.endedAt = Date.now();
      this.emit(job, "job:cancelled");
    }

    this.resolveIdleIfNeeded();
    return cancelled;
  }

  onIdle(): Promise<void> {
    if (this.isIdle()) return Promise.resolve();
    return new Promise((resolve) => this.idleResolvers.push(resolve));
  }

  private drain(): void {
    if (this.runningGlobal >= this.options.maxConcurrentGlobal) return;

    for (const session of this.sessions.values()) {
      if (this.runningGlobal >= this.options.maxConcurrentGlobal) return;
      if (session.running >= this.options.maxConcurrentPerSession) continue;
      if (session.pending.length === 0) continue;

      const job = session.pending.shift()!;
      this.startJob(job, session);
    }

    this.resolveIdleIfNeeded();
  }

  private startJob(job: WorkflowJob, session: SessionQueue): void {
    session.running++;
    this.runningGlobal++;
    job.status = "running";
    job.startedAt = Date.now();
    this.emit(job, "job:start");

    void this.options.runJob(job)
      .then(() => {
        if (job.status !== "cancelled") {
          job.status = "success";
          job.endedAt = Date.now();
          this.emit(job, "job:success");
        }
      })
      .catch((error: any) => {
        job.status = "failed";
        job.error = error?.message ?? String(error);
        job.endedAt = Date.now();
        this.emit(job, "job:failed", job.error);
      })
      .finally(() => {
        session.running--;
        this.runningGlobal--;
        this.drain();
        this.resolveIdleIfNeeded();
      });
  }

  private getSession(sessionId: string): SessionQueue {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;

    const created: SessionQueue = {
      pending: [],
      running: 0,
      stopped: false,
    };
    this.sessions.set(sessionId, created);
    return created;
  }

  private emit(job: WorkflowJob, type: SessionEvent["type"], error?: string): void {
    this.options.onEvent?.({
      type,
      sessionId: job.sessionId,
      workflowId: job.workflowId,
      executionId: job.executionId,
      triggerNodeId: job.triggerNodeId,
      jobId: job.id,
      source: job.source,
      timestamp: Date.now(),
      data: job.payload,
      error,
    });
  }

  private isIdle(): boolean {
    if (this.runningGlobal > 0) return false;
    for (const session of this.sessions.values()) {
      if (session.pending.length > 0 || session.running > 0) return false;
    }
    return true;
  }

  private resolveIdleIfNeeded(): void {
    if (!this.isIdle()) return;
    const resolvers = this.idleResolvers.splice(0);
    for (const resolve of resolvers) resolve();
  }
}
