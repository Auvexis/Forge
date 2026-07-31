import type Database from "better-sqlite3";
import type {
  AgentEngineRequest,
  AgentEngineRequestStatus,
} from "./agent-engine-request.ts";
import { assertAgentEngineRequestTransition } from "./agent-engine-request-transitions.ts";

export class AgentEngineRequestRepository {
  constructor(private readonly db: Database.Database) {}

  create(request: AgentEngineRequest): AgentEngineRequest {
    this.db.prepare(`
      INSERT INTO agent_engine_requests (
        id, idempotency_key, run_id, iteration, tool_call_id, action_id,
        tool_name, plugin_id, method_id, arguments_json, status,
        provider_metadata_json, attempt, max_attempts, lease_owner,
        lease_expires_at, next_retry_at, last_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      request.id,
      request.idempotencyKey,
      request.runId,
      request.iteration,
      request.toolCallId,
      request.actionId,
      request.toolName,
      request.pluginId ?? null,
      request.methodId ?? null,
      JSON.stringify(request.arguments),
      request.status,
      request.providerMetadata ? JSON.stringify(request.providerMetadata) : null,
      request.attempt ?? 0,
      request.maxAttempts ?? 3,
      request.leaseOwner ?? null,
      request.leaseExpiresAt ?? null,
      request.nextRetryAt ?? null,
      request.lastError ?? null,
      request.createdAt,
      request.updatedAt,
    );
    return this.getById(request.id)!;
  }

  createOrGet(request: AgentEngineRequest): AgentEngineRequest {
    const existing = this.getByIdempotencyKey(request.runId, request.idempotencyKey);
    return existing ?? this.create(request);
  }

  getById(id: string): AgentEngineRequest | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_engine_requests WHERE id = ?
    `).get(id) as AgentEngineRequestRow | undefined;
    return row ? toRequest(row) : null;
  }

  getByIdempotencyKey(runId: string, idempotencyKey: string): AgentEngineRequest | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_engine_requests
      WHERE run_id = ? AND idempotency_key = ?
    `).get(runId, idempotencyKey) as AgentEngineRequestRow | undefined;
    return row ? toRequest(row) : null;
  }

  listByRun(runId: string): AgentEngineRequest[] {
    return (this.db.prepare(`
      SELECT * FROM agent_engine_requests
      WHERE run_id = ?
      ORDER BY iteration ASC, created_at ASC
    `).all(runId) as AgentEngineRequestRow[]).map(toRequest);
  }

  updateStatus(id: string, status: AgentEngineRequestStatus): AgentEngineRequest {
    const current = this.getById(id);
    if (!current) throw new Error(`Agent engine request not found: ${id}`);
    assertAgentEngineRequestTransition(current.status, status);
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      UPDATE agent_engine_requests
      SET status = ?, updated_at = ?
      WHERE id = ? AND status = ?
    `).run(status, now, id, current.status);
    if (result.changes !== 1) {
      throw new Error(`Concurrent agent engine request update rejected: ${id}`);
    }
    return this.getById(id)!;
  }

  claimLease(input: {
    id: string;
    owner: string;
    now: Date;
    leaseMs: number;
  }): AgentEngineRequest {
    const now = input.now.toISOString();
    const expires = new Date(input.now.getTime() + input.leaseMs).toISOString();
    const result = this.db.prepare(`
      UPDATE agent_engine_requests
      SET status = 'leased', lease_owner = ?, lease_expires_at = ?,
          attempt = attempt + 1, next_retry_at = NULL, updated_at = ?
      WHERE id = ? AND (
        status = 'queued' OR
        (status IN ('leased', 'executing') AND lease_expires_at <= ?)
      ) AND attempt < max_attempts
    `).run(input.owner, expires, now, input.id, now);
    if (result.changes !== 1) {
      throw new Error(`Agent engine request lease is unavailable: ${input.id}`);
    }
    return this.getById(input.id)!;
  }

  renewLease(input: {
    id: string;
    owner: string;
    now: Date;
    leaseMs: number;
  }): AgentEngineRequest {
    const result = this.db.prepare(`
      UPDATE agent_engine_requests
      SET lease_expires_at = ?, updated_at = ?
      WHERE id = ? AND lease_owner = ? AND status IN ('leased', 'executing')
    `).run(
      new Date(input.now.getTime() + input.leaseMs).toISOString(),
      input.now.toISOString(),
      input.id,
      input.owner,
    );
    if (result.changes !== 1) throw new Error(`Agent engine lease ownership was lost: ${input.id}`);
    return this.getById(input.id)!;
  }

  scheduleRetry(input: {
    id: string;
    owner: string;
    nextRetryAt: Date;
    error: string;
  }): AgentEngineRequest {
    const current = this.getById(input.id);
    if (!current) throw new Error(`Agent engine request not found: ${input.id}`);
    const terminal = (current.attempt ?? 0) >= (current.maxAttempts ?? 3);
    const status: AgentEngineRequestStatus = terminal ? "dead-letter" : "queued";
    const result = this.db.prepare(`
      UPDATE agent_engine_requests
      SET status = ?, next_retry_at = ?, last_error = ?,
          lease_owner = NULL, lease_expires_at = NULL, updated_at = ?
      WHERE id = ? AND lease_owner = ? AND status IN ('leased', 'executing')
    `).run(
      status,
      terminal ? null : input.nextRetryAt.toISOString(),
      input.error,
      new Date().toISOString(),
      input.id,
      input.owner,
    );
    if (result.changes !== 1) throw new Error(`Agent engine retry ownership was lost: ${input.id}`);
    return this.getById(input.id)!;
  }

  listRecoverable(now = new Date(), limit = 100): AgentEngineRequest[] {
    return (this.db.prepare(`
      SELECT * FROM agent_engine_requests
      WHERE (
        status = 'queued' AND (next_retry_at IS NULL OR next_retry_at <= ?)
      ) OR (
        status IN ('leased', 'executing') AND lease_expires_at <= ?
      )
      ORDER BY created_at ASC
      LIMIT ?
    `).all(now.toISOString(), now.toISOString(), limit) as AgentEngineRequestRow[]).map(toRequest);
  }
}

interface AgentEngineRequestRow {
  id: string;
  idempotency_key: string;
  run_id: string;
  iteration: number;
  tool_call_id: string;
  action_id: string;
  tool_name: string;
  plugin_id: string | null;
  method_id: string | null;
  arguments_json: string;
  status: AgentEngineRequestStatus;
  provider_metadata_json: string | null;
  attempt?: number;
  max_attempts?: number;
  lease_owner?: string | null;
  lease_expires_at?: string | null;
  next_retry_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

function toRequest(row: AgentEngineRequestRow): AgentEngineRequest {
  return {
    kind: "tool",
    id: row.id,
    idempotencyKey: row.idempotency_key,
    runId: row.run_id,
    iteration: row.iteration,
    toolCallId: row.tool_call_id,
    actionId: row.action_id,
    toolName: row.tool_name,
    pluginId: row.plugin_id ?? undefined,
    methodId: row.method_id ?? undefined,
    arguments: JSON.parse(row.arguments_json) as Record<string, unknown>,
    status: row.status,
    providerMetadata: row.provider_metadata_json
      ? JSON.parse(row.provider_metadata_json)
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...((row.attempt ?? 0) > 0 ? { attempt: row.attempt } : {}),
    ...((row.max_attempts ?? 3) !== 3 ? { maxAttempts: row.max_attempts } : {}),
    ...(row.lease_owner ? { leaseOwner: row.lease_owner } : {}),
    ...(row.lease_expires_at ? { leaseExpiresAt: row.lease_expires_at } : {}),
    ...(row.next_retry_at ? { nextRetryAt: row.next_retry_at } : {}),
    ...(row.last_error ? { lastError: row.last_error } : {}),
  };
}
