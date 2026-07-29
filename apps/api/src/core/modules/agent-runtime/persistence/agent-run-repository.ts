import type Database from "better-sqlite3";
import { AgentRuntimeError } from "../agent-errors.ts";
import type { AgentRunRecord, AgentRunState } from "../contracts/agent-domain-contracts.ts";
import { assertAgentRunTransition } from "../contracts/agent-state-transitions.ts";

export interface CreateAgentRunInput {
  id: string;
  profileId: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  sessionId?: string;
  userMessage: string;
  state?: AgentRunState;
}

export class AgentRunRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateAgentRunInput): AgentRunRecord {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO agent_runs (
        id, profile_id, workflow_id, execution_id, node_id, session_id,
        user_message, state, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      input.id,
      input.profileId,
      input.workflowId,
      input.executionId,
      input.nodeId,
      input.sessionId ?? null,
      input.userMessage,
      input.state ?? "routing",
      now,
      now,
    );
    return this.getById(input.profileId, input.id)!;
  }

  getById(profileId: string, id: string): AgentRunRecord | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_runs WHERE profile_id = ? AND id = ?
    `).get(profileId, id) as AgentRunRow | undefined;
    return row ? toRun(row) : null;
  }

  findLatestSessionRun(input: {
    profileId: string;
    workflowId: string;
    nodeId: string;
    sessionId: string;
  }): AgentRunRecord | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_runs
      WHERE profile_id = ? AND workflow_id = ? AND node_id = ? AND session_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(
      input.profileId,
      input.workflowId,
      input.nodeId,
      input.sessionId,
    ) as AgentRunRow | undefined;
    return row ? toRun(row) : null;
  }

  updateState(input: {
    profileId: string;
    id: string;
    expectedVersion: number;
    state: AgentRunState;
  }): AgentRunRecord {
    const current = this.getById(input.profileId, input.id);
    if (!current) throw concurrencyError("run", input.id);
    if (current.version !== input.expectedVersion) throw concurrencyError("run", input.id);
    assertAgentRunTransition(current.state, input.state);

    const now = new Date().toISOString();
    const completedAt = isTerminal(input.state) ? now : null;
    const result = this.db.prepare(`
      UPDATE agent_runs
      SET state = ?, version = version + 1, updated_at = ?, completed_at = ?
      WHERE profile_id = ? AND id = ? AND version = ?
    `).run(
      input.state,
      now,
      completedAt,
      input.profileId,
      input.id,
      input.expectedVersion,
    );
    if (result.changes !== 1) throw concurrencyError("run", input.id);
    return this.getById(input.profileId, input.id)!;
  }

  acquireLease(input: {
    profileId: string;
    id: string;
    owner: string;
    now: Date;
    leaseMs: number;
  }): boolean {
    const now = input.now.toISOString();
    return this.db.prepare(`
      UPDATE agent_runs
      SET lease_owner = ?, lease_expires_at = ?, heartbeat_at = ?, updated_at = ?
      WHERE profile_id = ? AND id = ?
        AND (lease_owner IS NULL OR lease_owner = ? OR lease_expires_at <= ?)
        AND state NOT IN ('completed', 'failed', 'cancelled')
    `).run(
      input.owner,
      new Date(input.now.getTime() + input.leaseMs).toISOString(),
      now,
      now,
      input.profileId,
      input.id,
      input.owner,
      now,
    ).changes === 1;
  }

  heartbeatLease(input: {
    profileId: string;
    id: string;
    owner: string;
    now: Date;
    leaseMs: number;
  }): boolean {
    const now = input.now.toISOString();
    return this.db.prepare(`
      UPDATE agent_runs
      SET lease_expires_at = ?, heartbeat_at = ?, updated_at = ?
      WHERE profile_id = ? AND id = ? AND lease_owner = ? AND lease_expires_at > ?
    `).run(
      new Date(input.now.getTime() + input.leaseMs).toISOString(),
      now,
      now,
      input.profileId,
      input.id,
      input.owner,
      now,
    ).changes === 1;
  }

  releaseLease(profileId: string, id: string, owner: string): boolean {
    return this.db.prepare(`
      UPDATE agent_runs
      SET lease_owner = NULL, lease_expires_at = NULL
      WHERE profile_id = ? AND id = ? AND lease_owner = ?
    `).run(profileId, id, owner).changes === 1;
  }
}

interface AgentRunRow {
  id: string;
  profile_id: string;
  workflow_id: string;
  execution_id: string;
  node_id: string;
  session_id: string | null;
  user_message: string;
  state: AgentRunState;
  version: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function toRun(row: AgentRunRow): AgentRunRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    workflowId: row.workflow_id,
    executionId: row.execution_id,
    nodeId: row.node_id,
    sessionId: row.session_id ?? undefined,
    userMessage: row.user_message,
    state: row.state,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
  };
}

function isTerminal(state: AgentRunState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}

function concurrencyError(entity: "run" | "action", id: string): AgentRuntimeError {
  return new AgentRuntimeError(
    `Concurrent agent ${entity} update rejected for ${id}`,
    "AGENT_STATE_VERSION_CONFLICT",
    "The agent state changed while this request was running",
    409,
  );
}
