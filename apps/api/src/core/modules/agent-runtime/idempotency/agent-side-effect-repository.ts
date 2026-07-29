import type Database from "better-sqlite3";
import { AgentRuntimeError } from "../agent-errors.ts";

export type SideEffectReservation =
  | { status: "acquired"; ownerToken: string; attempt: number }
  | { status: "replay"; result: unknown }
  | { status: "busy"; leaseExpiresAt: string };

export interface ReserveSideEffectInput {
  idempotencyKey: string;
  profileId: string;
  runId: string;
  actionId: string;
  toolName: string;
  argumentsHash: string;
  ownerToken: string;
  now: Date;
  leaseMs: number;
}

export class AgentSideEffectRepository {
  constructor(private readonly db: Database.Database) {}

  reserve(input: ReserveSideEffectInput): SideEffectReservation {
    return this.db.transaction((): SideEffectReservation => {
      const now = input.now.toISOString();
      const leaseExpiresAt = new Date(input.now.getTime() + input.leaseMs).toISOString();
      this.db.prepare(`
        INSERT OR IGNORE INTO agent_side_effects (
          idempotency_key, profile_id, run_id, action_id, tool_name,
          arguments_hash, status, owner_token, attempt, lease_expires_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 1, ?, ?, ?)
      `).run(
        input.idempotencyKey,
        input.profileId,
        input.runId,
        input.actionId,
        input.toolName,
        input.argumentsHash,
        input.ownerToken,
        leaseExpiresAt,
        now,
        now,
      );

      let row = this.get(input.profileId, input.idempotencyKey);
      if (!row) throw sideEffectError("Reservation disappeared during transaction");
      assertReservationIdentity(row, input);
      if (row.status === "succeeded") {
        return { status: "replay", result: parseJson(row.result_json) };
      }
      if (row.status === "pending" && row.owner_token === input.ownerToken) {
        return { status: "acquired", ownerToken: row.owner_token, attempt: row.attempt };
      }
      if (row.status === "pending" && row.lease_expires_at > now) {
        return { status: "busy", leaseExpiresAt: row.lease_expires_at };
      }

      const claimed = this.db.prepare(`
        UPDATE agent_side_effects
        SET status = 'pending', owner_token = ?, attempt = attempt + 1,
            lease_expires_at = ?, error_json = NULL, updated_at = ?
        WHERE profile_id = ? AND idempotency_key = ?
          AND (status = 'failed' OR lease_expires_at <= ?)
      `).run(
        input.ownerToken,
        leaseExpiresAt,
        now,
        input.profileId,
        input.idempotencyKey,
        now,
      );
      if (claimed.changes !== 1) {
        row = this.get(input.profileId, input.idempotencyKey)!;
        return { status: "busy", leaseExpiresAt: row.lease_expires_at };
      }
      row = this.get(input.profileId, input.idempotencyKey)!;
      return { status: "acquired", ownerToken: row.owner_token, attempt: row.attempt };
    })();
  }

  succeed(input: {
    profileId: string;
    idempotencyKey: string;
    ownerToken: string;
    result: unknown;
    now: Date;
  }): void {
    const now = input.now.toISOString();
    const result = this.db.prepare(`
      UPDATE agent_side_effects
      SET status = 'succeeded', result_json = ?, updated_at = ?, completed_at = ?
      WHERE profile_id = ? AND idempotency_key = ?
        AND owner_token = ? AND status = 'pending'
    `).run(
      JSON.stringify(input.result),
      now,
      now,
      input.profileId,
      input.idempotencyKey,
      input.ownerToken,
    );
    if (result.changes !== 1) throw sideEffectError("Side-effect reservation ownership was lost");
  }

  fail(input: {
    profileId: string;
    idempotencyKey: string;
    ownerToken: string;
    error: Record<string, unknown>;
    now: Date;
  }): void {
    const result = this.db.prepare(`
      UPDATE agent_side_effects
      SET status = 'failed', error_json = ?, updated_at = ?
      WHERE profile_id = ? AND idempotency_key = ?
        AND owner_token = ? AND status = 'pending'
    `).run(
      JSON.stringify(input.error),
      input.now.toISOString(),
      input.profileId,
      input.idempotencyKey,
      input.ownerToken,
    );
    if (result.changes !== 1) throw sideEffectError("Side-effect reservation ownership was lost");
  }

  private get(profileId: string, idempotencyKey: string): SideEffectRow | null {
    return (this.db.prepare(`
      SELECT * FROM agent_side_effects
      WHERE profile_id = ? AND idempotency_key = ?
    `).get(profileId, idempotencyKey) as SideEffectRow | undefined) ?? null;
  }
}

interface SideEffectRow {
  idempotency_key: string;
  profile_id: string;
  run_id: string;
  action_id: string;
  tool_name: string;
  arguments_hash: string;
  status: "pending" | "succeeded" | "failed";
  owner_token: string;
  attempt: number;
  lease_expires_at: string;
  result_json: string | null;
}

function assertReservationIdentity(row: SideEffectRow, input: ReserveSideEffectInput): void {
  if (
    row.profile_id !== input.profileId ||
    row.run_id !== input.runId ||
    row.action_id !== input.actionId ||
    row.tool_name !== input.toolName ||
    row.arguments_hash !== input.argumentsHash
  ) {
    throw sideEffectError("Idempotency key was reused for another side effect");
  }
}

function parseJson(value: string | null): unknown {
  if (value === null) return undefined;
  return JSON.parse(value);
}

function sideEffectError(message: string): AgentRuntimeError {
  return new AgentRuntimeError(
    message,
    "AGENT_SIDE_EFFECT_CONFLICT",
    "Agent side-effect execution conflicted with another worker",
    409,
  );
}
