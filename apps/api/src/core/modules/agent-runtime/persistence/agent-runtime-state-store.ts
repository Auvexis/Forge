import type Database from "better-sqlite3";
import type { AgentRequiredAction } from "../intent/agent-intent-gateway.ts";
import type { AgentRunInput } from "../agent-types.ts";
import type { AgentActionRecord, AgentRunRecord } from "../contracts/agent-domain-contracts.ts";
import { AgentActionRepository } from "./agent-action-repository.ts";
import { AgentRunRepository } from "./agent-run-repository.ts";

export interface AgentRuntimeStateLifecycle {
  startRun(runId: string, input: AgentRunInput): void;
  markRunRunning(): void;
  markRunWaitingUser(): void;
  markRunWaitingApproval(): void;
  markRunCompleted(): void;
  markRunFailed(): void;
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
  private run?: AgentRunRecord;
  private readonly actionRecords = new Map<string, AgentActionRecord>();

  constructor(db: Database.Database) {
    this.runs = new AgentRunRepository(db);
    this.actions = new AgentActionRepository(db);
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

  initializeActions(actions: AgentRequiredAction[]): void {
    actions.forEach((action, position) => {
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
}
