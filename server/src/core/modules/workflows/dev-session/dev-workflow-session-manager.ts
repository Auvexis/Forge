import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";
import { schedule as scheduleCronTask } from "node-cron";
import { InternalEventBus, type InternalEvent } from "../../events/internal-event-bus.ts";
import { cancelTemporaryFormSessionsByExecution } from "../../forms/temporary-form-session.ts";
import { CancellationRegistry } from "../cancellation-registry.ts";
import { workflowEventBus, type WorkflowEvent } from "../event-bus.ts";
import {
  getTriggerFormPublicId,
  getTriggerWebhookPath,
  listPluginTriggers,
  listTriggerEntries,
} from "../workflow-triggers.ts";
import { WorkflowLifecycleManager } from "../lifecycle.ts";
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

export interface CreateDevWorkflowSessionOptions {
  initialPayload?: unknown;
  initialTriggerNodeId?: string;
}

export interface DevWorkflowSessionManagerOptions {
  maxConcurrentPerSession?: number;
  maxConcurrentGlobal?: number;
  maxSessions?: number;
  maxPayloadBytes?: number;
  createId?: (prefix: "session" | "job" | "exec") => string;
  scheduleCron?: (
    expression: string,
    callback: () => void,
  ) => { stop: () => void };
  activatePluginTriggers?: (workflow: WorkflowItem) => Promise<void>;
  deactivatePluginTriggers?: (workflow: WorkflowItem) => Promise<void>;
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
  private readonly scheduleCronFn: NonNullable<DevWorkflowSessionManagerOptions["scheduleCron"]>;
  private readonly activatePluginTriggers: NonNullable<
    DevWorkflowSessionManagerOptions["activatePluginTriggers"]
  >;
  private readonly deactivatePluginTriggers: NonNullable<
    DevWorkflowSessionManagerOptions["deactivatePluginTriggers"]
  >;
  private readonly eventTriggerCounts = new Map<string, number>();
  private readonly jobsById = new Map<string, WorkflowJob>();
  private readonly activeJobIdsBySession = new Map<string, Set<string>>();
  private readonly runner: WorkflowJobRunner;
  private readonly queue: InMemoryExecutionQueue;
  private readonly runWorkflowJob?: DevWorkflowSessionManagerOptions["runWorkflowJob"];
  private readonly options: DevWorkflowSessionManagerOptions;

  constructor(options: DevWorkflowSessionManagerOptions = {}) {
    this.options = options;
    this.createIdFn = options.createId ?? defaultCreateId;
    this.scheduleCronFn =
      options.scheduleCron ??
      ((expression, callback) => scheduleCronTask(expression, callback));
    this.activatePluginTriggers =
      options.activatePluginTriggers ?? WorkflowLifecycleManager.activate;
    this.deactivatePluginTriggers =
      options.deactivatePluginTriggers ?? WorkflowLifecycleManager.deactivate;
    this.runWorkflowJob = options.runWorkflowJob;
    this.runner = new WorkflowJobRunner({
      createId: (prefix) => this.createIdFn(prefix),
    });
    this.queue = new InMemoryExecutionQueue({
      maxConcurrentPerSession: options.maxConcurrentPerSession ?? 2,
      maxConcurrentGlobal: options.maxConcurrentGlobal ?? 8,
      onEvent: (event) => {
        this.handleQueueEvent(event);
        options.onEvent?.(event);
      },
      runJob: async (job) => {
        const session = this.sessions.get(job.sessionId);
        if (!session) return;
        const unsubscribe = workflowEventBus.onExecution(job.executionId, (event) => {
          this.emitWorkflowEvent(job, event);
        });
        try {
          if (this.runWorkflowJob) {
            await this.runWorkflowJob(job, session.workflow);
            return;
          }
          await this.runner.run(job, session.workflow);
        } finally {
          unsubscribe();
        }
      },
    });
  }

  createSession(
    workflow: WorkflowItem,
    options: CreateDevWorkflowSessionOptions = {},
  ): DevWorkflowSession {
    if (this.sessions.size >= (this.options.maxSessions ?? 10)) {
      throw new Error("Too many active dev sessions");
    }

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
    try {
      this.emitSessionEvent(session, "session:start");
      this.transition(session, "running");
      this.activatePluginLifecycle(session);
      this.activateInitialTriggers(
        session,
        options.initialPayload ?? {},
        options.initialTriggerNodeId,
      );
      this.emitSessionEvent(session, "session:ready");
      return session;
    } catch (error: any) {
      this.cleanupFailedSession(session, error?.message ?? String(error));
      throw error;
    }
  }

  getSession(sessionId: string): DevWorkflowSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  enqueueJob(sessionId: string, input: EnqueueDevWorkflowJobInput): WorkflowJob {
    const session = this.requireSession(sessionId);
    if (session.status === "stopping" || session.status === "stopped") {
      throw new Error(`Cannot enqueue job for ${session.status} session ${sessionId}`);
    }
    this.assertPayloadSize(input.payload);

    const job = this.runner.createJob({
      sessionId,
      workflowId: session.workflowId,
      triggerNodeId: input.triggerNodeId,
      source: input.source,
      payload: input.payload,
    });
    this.jobsById.set(job.id, job);
    return this.queue.enqueue(job);
  }

  enqueueWebhook(webhookPath: string, payload: unknown): boolean {
    for (const session of this.sessions.values()) {
      if (session.status !== "running") continue;

      for (const entry of listTriggerEntries(session.workflow)) {
        if (entry.disabled) continue;
        if (entry.trigger.type !== "webhook" && entry.trigger.type !== "plugin") continue;
        if (getTriggerWebhookPath(session.workflow, entry) !== webhookPath) continue;
        const source = entry.trigger.type === "plugin" ? "plugin" : "webhook";

        this.options.onEvent?.({
          type: "trigger:received",
          sessionId: session.id,
          workflowId: session.workflowId,
          triggerNodeId: entry.id,
          source,
          timestamp: Date.now(),
          data: payload,
        });
        this.enqueueJob(session.id, {
          triggerNodeId: entry.id,
          source,
          payload,
        });
        return true;
      }
    }

    return false;
  }

  enqueueForm(formId: string, payload: unknown): boolean {
    for (const session of this.sessions.values()) {
      if (session.status !== "running") continue;

      for (const entry of listTriggerEntries(session.workflow)) {
        if (entry.disabled) continue;
        if (entry.trigger.type !== "form") continue;
        const publicId = getTriggerFormPublicId(session.workflow, entry);
        if (session.workflowId !== formId && publicId !== formId) continue;

        this.options.onEvent?.({
          type: "trigger:received",
          sessionId: session.id,
          workflowId: session.workflowId,
          triggerNodeId: entry.id,
          source: "form",
          timestamp: Date.now(),
          data: payload,
        });
        this.enqueueJob(session.id, {
          triggerNodeId: entry.id,
          source: "form",
          payload,
        });
        return true;
      }
    }

    return false;
  }

  async stopSession(sessionId: string, reason: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || this.stopping.has(sessionId)) return;

    this.stopping.add(sessionId);
    try {
      this.transition(session, "stopping");
      session.stopReason = reason;
      this.emitSessionEvent(session, "session:stopping");
      for (const runtime of session.triggerRuntimes.splice(0)) {
        await runtime.teardown();
      }
      this.cancelRunningJobs(sessionId, reason);
      this.queue.stopSession(sessionId);
      this.transition(session, "stopped");
      session.stoppedAt = Date.now();
      this.emitSessionEvent(session, "session:stopped");
      this.sessions.delete(sessionId);
      this.cleanupSessionState(sessionId);
    } finally {
      this.stopping.delete(sessionId);
    }
  }

  async stopAll(reason: string): Promise<void> {
    await Promise.all(
      Array.from(this.sessions.keys()).map((sessionId) =>
        this.stopSession(sessionId, reason),
      ),
    );
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

  private assertPayloadSize(payload: unknown): void {
    const maxBytes = this.options.maxPayloadBytes ?? 256 * 1024;
    const bytes = Buffer.byteLength(JSON.stringify(payload ?? null), "utf8");
    if (bytes > maxBytes) {
      throw new Error(`Dev workflow job payload exceeds ${maxBytes} bytes`);
    }
  }

  private handleQueueEvent(event: SessionEvent): void {
    if (!event.jobId) return;

    if (event.type === "job:start") {
      const jobs = this.activeJobIdsBySession.get(event.sessionId) ?? new Set<string>();
      jobs.add(event.jobId);
      this.activeJobIdsBySession.set(event.sessionId, jobs);
      return;
    }

    if (
      event.type === "job:success" ||
      event.type === "job:failed" ||
      event.type === "job:cancelled"
    ) {
      this.activeJobIdsBySession.get(event.sessionId)?.delete(event.jobId);
      this.jobsById.delete(event.jobId);
    }
  }

  private cancelRunningJobs(sessionId: string, reason: string): void {
    const jobIds = Array.from(this.activeJobIdsBySession.get(sessionId) ?? []);
    for (const jobId of jobIds) {
      const job = this.jobsById.get(jobId);
      if (!job) continue;
      CancellationRegistry.cancel(job.executionId);
      cancelTemporaryFormSessionsByExecution(job.executionId, reason);
    }
    this.activeJobIdsBySession.delete(sessionId);
  }

  private cleanupFailedSession(session: DevWorkflowSession, reason: string): void {
    for (const runtime of session.triggerRuntimes.splice(0)) {
      try {
        void Promise.resolve(runtime.teardown()).catch(() => {});
      } catch {
        /* teardown best effort */
      }
    }
    this.cancelRunningJobs(session.id, reason);
    this.queue.stopSession(session.id);
    this.transition(session, "failed");
    session.stopReason = reason;
    session.stoppedAt = Date.now();
    this.sessions.delete(session.id);
    this.cleanupSessionState(session.id);
  }

  private cleanupSessionState(sessionId: string): void {
    for (const key of Array.from(this.eventTriggerCounts.keys())) {
      if (key.startsWith(`${sessionId}:`)) this.eventTriggerCounts.delete(key);
    }
    this.activeJobIdsBySession.delete(sessionId);
    for (const [jobId, job] of Array.from(this.jobsById.entries())) {
      if (job.sessionId === sessionId) this.jobsById.delete(jobId);
    }
  }

  private activateInitialTriggers(
    session: DevWorkflowSession,
    initialPayload: unknown,
    initialTriggerNodeId?: string,
  ): void {
    for (const entry of listTriggerEntries(session.workflow)) {
      if (entry.disabled) continue;

      if (entry.trigger.type === "manual") {
        if (!initialTriggerNodeId || entry.id !== initialTriggerNodeId) continue;
        this.enqueueJob(session.id, {
          triggerNodeId: entry.id,
          source: "manual",
          payload: initialPayload,
        });
        continue;
      }

      if (entry.trigger.type === "cron" && entry.trigger.cronExpression) {
        const task = this.scheduleCronFn(entry.trigger.cronExpression, () => {
          if (session.status !== "running") return;
          this.enqueueJob(session.id, {
            triggerNodeId: entry.id,
            source: "cron",
            payload: {
              scheduledAt: Date.now(),
              cronExpression: entry.trigger.cronExpression,
            },
          });
        });
        session.triggerRuntimes.push({
          triggerNodeId: entry.id,
          type: "cron",
          teardown: () => task.stop(),
        });
      }

      if (entry.trigger.type === "event" && entry.trigger.eventName) {
        const off = InternalEventBus.on(entry.trigger.eventName, (event) => {
          this.enqueueInternalEvent(session, entry.id, event);
        });
        session.triggerRuntimes.push({
          triggerNodeId: entry.id,
          type: "event",
          teardown: off,
        });
      }

      this.options.onEvent?.({
        type: "trigger:waiting",
        sessionId: session.id,
        workflowId: session.workflowId,
        triggerNodeId: entry.id,
        source: entry.trigger.type,
        timestamp: Date.now(),
      });
    }
  }

  private activatePluginLifecycle(session: DevWorkflowSession): void {
    if (listPluginTriggers(session.workflow).length === 0) return;

    void this.activatePluginTriggers(session.workflow).catch((error: any) => {
      this.options.onEvent?.({
        type: "job:failed",
        sessionId: session.id,
        workflowId: session.workflowId,
        source: "plugin",
        timestamp: Date.now(),
        error: error?.message ?? String(error),
      });
    });

    session.triggerRuntimes.push({
      triggerNodeId: "plugin-lifecycle",
      type: "plugin",
      teardown: () => this.deactivatePluginTriggers(session.workflow),
    });
  }

  private emitSessionEvent(
    session: DevWorkflowSession,
    type: SessionEvent["type"],
  ): void {
    this.options.onEvent?.({
      type,
      sessionId: session.id,
      workflowId: session.workflowId,
      timestamp: Date.now(),
    });
  }

  private enqueueInternalEvent(
    session: DevWorkflowSession,
    triggerNodeId: string,
    event: InternalEvent,
  ): void {
    if (session.status !== "running") return;
    const counterKey = `${session.id}:${event.name}`;
    const count = (this.eventTriggerCounts.get(counterKey) ?? 0) + 1;
    this.eventTriggerCounts.set(counterKey, count);
    if (count > 25) {
      this.options.onEvent?.({
        type: "job:failed",
        sessionId: session.id,
        workflowId: session.workflowId,
        triggerNodeId,
        source: "event",
        timestamp: Date.now(),
        error: `Event trigger anti-loop limit reached for "${event.name}"`,
      });
      return;
    }

    const payload = {
      event: event.name,
      payload: event.payload,
      emittedBy: event.emittedBy ?? "unknown",
      timestamp: event.timestamp,
      triggerNodeId,
    };
    this.options.onEvent?.({
      type: "trigger:received",
      sessionId: session.id,
      workflowId: session.workflowId,
      triggerNodeId,
      source: "event",
      timestamp: Date.now(),
      data: payload,
    });
    this.enqueueJob(session.id, {
      triggerNodeId,
      source: "event",
      payload,
    });
  }

  private emitWorkflowEvent(job: WorkflowJob, event: WorkflowEvent): void {
    const mappedType = workflowEventToSessionEvent(event.type);
    if (!mappedType) return;

    this.options.onEvent?.({
      type: mappedType,
      sessionId: job.sessionId,
      workflowId: job.workflowId,
      executionId: job.executionId,
      triggerNodeId: job.triggerNodeId,
      nodeId: event.nodeId,
      jobId: job.id,
      source: job.source,
      timestamp: event.timestamp,
      data: event.data,
      error: event.error,
    });
  }
}

function workflowEventToSessionEvent(
  type: WorkflowEvent["type"],
): SessionEvent["type"] | null {
  if (type === "node:start") return "node:start";
  if (type === "node:success") return "node:success";
  if (type === "node:failed") return "node:failed";
  return null;
}
