import type Database from "better-sqlite3";
import type {
  AgentActionRecord,
  AgentActionState,
} from "../contracts/agent-domain-contracts.ts";

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
