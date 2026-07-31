import type Database from "better-sqlite3";
import type {
  AgentEngineRequest,
  AgentEngineRequestStatus,
} from "./agent-engine-request.ts";

export class AgentEngineRequestRepository {
  constructor(private readonly db: Database.Database) {}

  create(request: AgentEngineRequest): AgentEngineRequest {
    this.db.prepare(`
      INSERT INTO agent_engine_requests (
        id, idempotency_key, run_id, iteration, tool_call_id, action_id,
        tool_name, plugin_id, method_id, arguments_json, status,
        provider_metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      request.createdAt,
      request.updatedAt,
    );
    return this.getById(request.id)!;
  }

  getById(id: string): AgentEngineRequest | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_engine_requests WHERE id = ?
    `).get(id) as AgentEngineRequestRow | undefined;
    return row ? toRequest(row) : null;
  }

  listByRun(runId: string): AgentEngineRequest[] {
    return (this.db.prepare(`
      SELECT * FROM agent_engine_requests
      WHERE run_id = ?
      ORDER BY iteration ASC, created_at ASC
    `).all(runId) as AgentEngineRequestRow[]).map(toRequest);
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
  };
}
