import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { AgentRuntimeError } from "../agent-errors.ts";
import type { AgentRequiredAction } from "../intent/agent-intent-gateway.ts";
import type { AgentRunInput } from "../agent-types.ts";
import type { AgentActionRecord, AgentRunRecord } from "../contracts/agent-domain-contracts.ts";
import type { AgentPendingInteraction, AgentPendingInteractionKind } from "../contracts/agent-domain-contracts.ts";
import { AgentActionRepository } from "./agent-action-repository.ts";
import { AgentRunRepository } from "./agent-run-repository.ts";
import { AgentPendingInteractionRepository } from "./agent-pending-interaction-repository.ts";

export interface AgentRuntimeStateLifecycle {
  startRun(runId: string, input: AgentRunInput): void;
  findPendingInteraction(input: AgentRunInput): AgentPendingInteraction | null;
  resumeRun(profileId: string, runId: string): void;
  createPendingInteraction(input: {
    id: string;
    actionId?: string;
    kind: AgentPendingInteractionKind;
    question: string;
    context: Record<string, unknown>;
  }): void;
  resolvePendingInteraction(profileId: string, id: string, response: unknown): void;
  cancelPendingInteraction(profileId: string, id: string): void;
  markRunRunning(): void;
  markRunWaitingUser(): void;
  markRunWaitingApproval(): void;
  markRunCompleted(): void;
  markRunFailed(): void;
  markRunCancelled(): void;
  initializeActions(actions: AgentRequiredAction[]): void;
  markActionRunning(actionId: string): void;
  markActionWaitingUser(actionId: string, output?: unknown): void;
  markActionWaitingApproval(actionId: string): void;
  markActionCompleted(actionId: string, output?: unknown): void;
  markActionFailed(actionId: string, output?: unknown): void;
}

export class AgentRuntimeStateStore implements AgentRuntimeStateLifecycle {
  private readonly runs: AgentRunRepository;
  private readonly actions: AgentActionRepository;
  private readonly interactions: AgentPendingInteractionRepository;
  private run?: AgentRunRecord;
  private readonly actionRecords = new Map<string, AgentActionRecord>();
  private readonly leaseOwner = `worker_${randomUUID()}`;
  private leaseHeartbeat?: NodeJS.Timeout;
  private static readonly LEASE_MS = 30_000;
  private static readonly HEARTBEAT_MS = 10_000;

  constructor(db: Database.Database) {
    this.runs = new AgentRunRepository(db);
    this.actions = new AgentActionRepository(db);
    this.interactions = new AgentPendingInteractionRepository(db);
  }

  startRun(runId: string, input: AgentRunInput): void {
    this.run = this.runs.create({
      id: runId,
      profileId: input.profileId,
      workflowId: input.workflowId,
      executionId: input.executionId,
      nodeId: input.nodeId,
      sessionId: input.sessionId,
      userMessage: input.userMessage,
    });
    this.acquireLease();
  }

  findPendingInteraction(input: AgentRunInput): AgentPendingInteraction | null {
    if (!input.sessionId) return null;
    return this.interactions.getPendingForSession({
      profileId: input.profileId,
      workflowId: input.workflowId,
      nodeId: input.nodeId,
      sessionId: input.sessionId,
    });
  }

  resumeRun(profileId: string, runId: string): void {
    const run = this.runs.getById(profileId, runId);
    if (!run) throw new Error(`Agent run was not found for resume: ${runId}`);
    this.run = run;
    this.actionRecords.clear();
    for (const action of this.actions.listByRun(profileId, runId)) {
      this.actionRecords.set(action.id, action);
    }
    this.acquireLease();
  }

  createPendingInteraction(input: {
    id: string;
    actionId?: string;
    kind: AgentPendingInteractionKind;
    question: string;
    context: Record<string, unknown>;
  }): void {
    this.interactions.create({
      ...input,
      runId: this.requireRun().id,
    });
  }

  resolvePendingInteraction(profileId: string, id: string, response: unknown): void {
    this.interactions.resolve({ profileId, id, response });
  }

  cancelPendingInteraction(profileId: string, id: string): void {
    this.interactions.cancel(profileId, id);
  }

  markRunRunning(): void {
    this.transitionRun("running");
  }

  markRunWaitingUser(): void {
    this.transitionRun("waiting-user");
  }

  markRunWaitingApproval(): void {
    this.transitionRun("waiting-approval");
  }

  markRunCompleted(): void {
    this.transitionRun("completed");
  }

  markRunFailed(): void {
    this.transitionRun("failed");
  }

  markRunCancelled(): void {
    this.transitionRun("cancelled");
  }

  initializeActions(actions: AgentRequiredAction[]): void {
    actions.forEach((action, position) => {
      if (this.actionRecords.has(action.id)) return;
      const record = this.actions.create({
        id: action.id,
        runId: this.requireRun().id,
        position,
        toolName: action.toolName,
        objective: action.objective,
        dependsOn: action.dependsOn,
      });
      this.actionRecords.set(action.id, record);
    });
  }

  markActionRunning(actionId: string): void {
    this.transitionAction(actionId, "ready");
    this.transitionAction(actionId, "running");
  }

  markActionWaitingUser(actionId: string, output?: unknown): void {
    const action = this.actionRecords.get(actionId);
    if (action?.state === "pending") this.transitionAction(actionId, "ready");
    this.transitionAction(actionId, "waiting-user", output);
  }

  markActionWaitingApproval(actionId: string): void {
    this.transitionAction(actionId, "waiting-approval");
  }

  markActionCompleted(actionId: string, output?: unknown): void {
    this.transitionAction(actionId, "completed", output);
  }

  markActionFailed(actionId: string, output?: unknown): void {
    this.transitionAction(actionId, "failed", output);
  }

  private transitionRun(state: AgentRunRecord["state"]): void {
    const run = this.requireRun();
    this.run = this.runs.updateState({
      profileId: run.profileId,
      id: run.id,
      expectedVersion: run.version,
      state,
    });
    if (
      state === "waiting-user" ||
      state === "waiting-approval" ||
      state === "completed" ||
      state === "failed" ||
      state === "cancelled"
    ) {
      this.releaseLease();
    }
  }

  private transitionAction(
    actionId: string,
    state: AgentActionRecord["state"],
    output?: unknown,
  ): void {
    const action = this.actionRecords.get(actionId);
    if (!action) throw new Error(`Agent action state was not initialized: ${actionId}`);
    const updated = this.actions.updateState({
      runId: action.runId,
      id: action.id,
      expectedVersion: action.version,
      state,
      output,
    });
    this.actionRecords.set(actionId, updated);
  }

  private requireRun(): AgentRunRecord {
    if (!this.run) throw new Error("Agent run state was not initialized");
    return this.run;
  }

  private acquireLease(): void {
    const run = this.requireRun();
    const acquired = this.runs.acquireLease({
      profileId: run.profileId,
      id: run.id,
      owner: this.leaseOwner,
      now: new Date(),
      leaseMs: AgentRuntimeStateStore.LEASE_MS,
    });
    if (!acquired) {
      throw new AgentRuntimeError(
        `Agent run lease is owned by another worker: ${run.id}`,
        "AGENT_RUN_LEASE_CONFLICT",
        "Agent run is already being processed",
        409,
      );
    }
    this.leaseHeartbeat = setInterval(() => {
      const active = this.run;
      if (!active) return;
      this.runs.heartbeatLease({
        profileId: active.profileId,
        id: active.id,
        owner: this.leaseOwner,
        now: new Date(),
        leaseMs: AgentRuntimeStateStore.LEASE_MS,
      });
    }, AgentRuntimeStateStore.HEARTBEAT_MS);
    this.leaseHeartbeat.unref?.();
  }

  private releaseLease(): void {
    if (this.leaseHeartbeat) clearInterval(this.leaseHeartbeat);
    this.leaseHeartbeat = undefined;
    const run = this.requireRun();
    this.runs.releaseLease(run.profileId, run.id, this.leaseOwner);
  }
}
