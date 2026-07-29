import type Database from "better-sqlite3";
import { AgentRuntimeError } from "../agent-errors.ts";
import type {
  AgentPendingInteraction,
  AgentPendingInteractionKind,
} from "../contracts/agent-domain-contracts.ts";

export interface CreatePendingInteractionInput {
  id: string;
  runId: string;
  actionId?: string;
  kind: AgentPendingInteractionKind;
  question: string;
  context: Record<string, unknown>;
}

export class AgentPendingInteractionRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreatePendingInteractionInput): AgentPendingInteraction {
    const now = new Date().toISOString();
    try {
      this.db.prepare(`
        INSERT INTO agent_pending_interactions (
          id, run_id, action_id, kind, question, context_json,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(
        input.id,
        input.runId,
        input.actionId ?? null,
        input.kind,
        input.question,
        JSON.stringify(input.context),
        now,
        now,
      );
    } catch {
      throw new AgentRuntimeError(
        "The agent run is already waiting for a response",
        "AGENT_INTERACTION_CONFLICT",
        "The agent is already waiting for a response",
        409,
      );
    }
    return this.getById(input.runId, input.id)!;
  }

  getPendingForSession(input: {
    profileId: string;
    workflowId: string;
    nodeId: string;
    sessionId: string;
  }): AgentPendingInteraction | null {
    const row = this.db.prepare(`
      SELECT interaction.*
      FROM agent_pending_interactions interaction
      INNER JOIN agent_runs run ON run.id = interaction.run_id
      WHERE run.profile_id = ? AND run.workflow_id = ? AND run.node_id = ?
        AND run.session_id = ? AND interaction.status = 'pending'
      ORDER BY interaction.created_at DESC
      LIMIT 1
    `).get(
      input.profileId,
      input.workflowId,
      input.nodeId,
      input.sessionId,
    ) as PendingInteractionRow | undefined;
    return row ? toInteraction(row) : null;
  }

  resolve(input: {
    profileId: string;
    id: string;
    response: unknown;
  }): AgentPendingInteraction {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      UPDATE agent_pending_interactions
      SET status = 'resolved', response_json = ?, updated_at = ?, resolved_at = ?
      WHERE id = ? AND status = 'pending' AND run_id IN (
        SELECT id FROM agent_runs WHERE profile_id = ?
      )
    `).run(JSON.stringify(input.response), now, now, input.id, input.profileId);
    if (result.changes !== 1) throw notPendingError(input.id);
    return this.getByProfile(input.profileId, input.id)!;
  }

  cancel(profileId: string, id: string): AgentPendingInteraction {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      UPDATE agent_pending_interactions
      SET status = 'cancelled', updated_at = ?, resolved_at = ?
      WHERE id = ? AND status = 'pending' AND run_id IN (
        SELECT id FROM agent_runs WHERE profile_id = ?
      )
    `).run(now, now, id, profileId);
    if (result.changes !== 1) throw notPendingError(id);
    return this.getByProfile(profileId, id)!;
  }

  private getById(runId: string, id: string): AgentPendingInteraction | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_pending_interactions WHERE run_id = ? AND id = ?
    `).get(runId, id) as PendingInteractionRow | undefined;
    return row ? toInteraction(row) : null;
  }

  private getByProfile(profileId: string, id: string): AgentPendingInteraction | null {
    const row = this.db.prepare(`
      SELECT interaction.*
      FROM agent_pending_interactions interaction
      INNER JOIN agent_runs run ON run.id = interaction.run_id
      WHERE run.profile_id = ? AND interaction.id = ?
    `).get(profileId, id) as PendingInteractionRow | undefined;
    return row ? toInteraction(row) : null;
  }
}

interface PendingInteractionRow {
  id: string;
  run_id: string;
  action_id: string | null;
  kind: AgentPendingInteractionKind;
  question: string;
  context_json: string;
  status: AgentPendingInteraction["status"];
}

function toInteraction(row: PendingInteractionRow): AgentPendingInteraction {
  return {
    id: row.id,
    runId: row.run_id,
    actionId: row.action_id ?? undefined,
    kind: row.kind,
    question: row.question,
    context: JSON.parse(row.context_json) as Record<string, unknown>,
    status: row.status,
  };
}

function notPendingError(id: string): AgentRuntimeError {
  return new AgentRuntimeError(
    `Pending agent interaction not found: ${id}`,
    "AGENT_INTERACTION_NOT_PENDING",
    "The pending agent interaction was already handled",
    409,
  );
}
