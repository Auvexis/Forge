import type Database from "better-sqlite3";
import { AgentRuntimeError } from "../agent-errors.ts";
import type {
  AgentActionRecord,
  AgentActionState,
} from "../contracts/agent-domain-contracts.ts";
import { assertAgentActionTransition } from "../contracts/agent-state-transitions.ts";

export interface CreateAgentActionInput {
  id: string;
  runId: string;
  position: number;
  toolName: string;
  objective: string;
  dependsOn?: string[];
  state?: AgentActionState;
  arguments?: Record<string, unknown>;
}

export class AgentActionRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateAgentActionInput): AgentActionRecord {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO agent_actions (
        id, run_id, position, tool_name, objective, depends_on_json,
        state, arguments_json, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      input.id,
      input.runId,
      input.position,
      input.toolName,
      input.objective,
      JSON.stringify(input.dependsOn ?? []),
      input.state ?? "pending",
      serializeOptional(input.arguments),
      now,
      now,
    );

    return this.getById(input.runId, input.id)!;
  }

  getById(runId: string, id: string): AgentActionRecord | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_actions WHERE run_id = ? AND id = ?
    `).get(runId, id) as AgentActionRow | undefined;
    return row ? toAction(row) : null;
  }

  listByRun(profileId: string, runId: string): AgentActionRecord[] {
    const rows = this.db.prepare(`
      SELECT action.*
      FROM agent_actions action
      INNER JOIN agent_runs run ON run.id = action.run_id
      WHERE run.profile_id = ? AND action.run_id = ?
      ORDER BY action.position ASC
    `).all(profileId, runId) as AgentActionRow[];
    return rows.map(toAction);
  }

  updateState(input: {
    runId: string;
    id: string;
    expectedVersion: number;
    state: AgentActionState;
    arguments?: Record<string, unknown>;
    output?: unknown;
  }): AgentActionRecord {
    const current = this.getById(input.runId, input.id);
    if (!current) throw concurrencyError(input.id);
    if (current.version !== input.expectedVersion) throw concurrencyError(input.id);
    assertAgentActionTransition(current.state, input.state);

    const result = this.db.prepare(`
      UPDATE agent_actions
      SET state = ?,
          arguments_json = COALESCE(?, arguments_json),
          output_json = COALESCE(?, output_json),
          version = version + 1,
          updated_at = ?
      WHERE run_id = ? AND id = ? AND version = ?
    `).run(
      input.state,
      serializeOptional(input.arguments),
      serializeOptional(input.output),
      new Date().toISOString(),
      input.runId,
      input.id,
      input.expectedVersion,
    );
    if (result.changes !== 1) throw concurrencyError(input.id);
    return this.getById(input.runId, input.id)!;
  }
}

interface AgentActionRow {
  id: string;
  run_id: string;
  position: number;
  tool_name: string;
  objective: string;
  depends_on_json: string;
  state: AgentActionState;
  arguments_json: string | null;
  output_json: string | null;
  version: number;
}

function toAction(row: AgentActionRow): AgentActionRecord {
  return {
    id: row.id,
    runId: row.run_id,
    toolName: row.tool_name,
    objective: row.objective,
    dependsOn: parseJson<string[]>(row.depends_on_json, []),
    state: row.state,
    arguments: parseOptionalJson<Record<string, unknown>>(row.arguments_json),
    output: parseOptionalJson<unknown>(row.output_json),
    version: row.version,
  };
}

function serializeOptional(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

function parseOptionalJson<T>(value: string | null): T | undefined {
  return value === null ? undefined : parseJson<T>(value, undefined);
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function concurrencyError(id: string): AgentRuntimeError {
  return new AgentRuntimeError(
    `Concurrent agent action update rejected for ${id}`,
    "AGENT_STATE_VERSION_CONFLICT",
    "The agent state changed while this request was running",
    409,
  );
}
