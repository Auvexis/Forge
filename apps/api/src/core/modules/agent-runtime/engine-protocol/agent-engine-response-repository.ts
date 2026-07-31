import type Database from "better-sqlite3";
import type { AgentMcpError } from "../contracts/agent-domain-contracts.ts";
import type { AgentEngineResponse } from "./agent-engine-response.ts";

export class AgentEngineResponseRepository {
  constructor(private readonly db: Database.Database) {}

  create(response: AgentEngineResponse): AgentEngineResponse {
    this.db.prepare(`
      INSERT INTO agent_engine_responses (
        id, request_id, run_id, tool_call_id, status,
        output_json, error_json, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      response.id,
      response.requestId,
      response.runId,
      response.toolCallId,
      response.status,
      response.status === "succeeded" ? JSON.stringify(response.output) : null,
      response.status === "failed" ? JSON.stringify(response.error) : null,
      response.status === "cancelled" ? response.reason ?? null : null,
      response.createdAt,
    );
    return this.getByRequestId(response.requestId)!;
  }

  getByRequestId(requestId: string): AgentEngineResponse | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_engine_responses WHERE request_id = ?
    `).get(requestId) as AgentEngineResponseRow | undefined;
    return row ? toResponse(row) : null;
  }

  listByRun(runId: string): AgentEngineResponse[] {
    return (this.db.prepare(`
      SELECT * FROM agent_engine_responses
      WHERE run_id = ?
      ORDER BY created_at ASC
    `).all(runId) as AgentEngineResponseRow[]).map(toResponse);
  }
}

interface AgentEngineResponseRow {
  id: string;
  request_id: string;
  run_id: string;
  tool_call_id: string;
  status: AgentEngineResponse["status"];
  output_json: string | null;
  error_json: string | null;
  reason: string | null;
  created_at: string;
}

function toResponse(row: AgentEngineResponseRow): AgentEngineResponse {
  const base = {
    id: row.id,
    requestId: row.request_id,
    runId: row.run_id,
    toolCallId: row.tool_call_id,
    createdAt: row.created_at,
  };
  if (row.status === "succeeded") {
    return {
      ...base,
      status: "succeeded",
      output: row.output_json ? JSON.parse(row.output_json) : null,
    };
  }
  if (row.status === "failed") {
    return {
      ...base,
      status: "failed",
      error: JSON.parse(row.error_json ?? "{}") as AgentMcpError,
    };
  }
  return {
    ...base,
    status: "cancelled",
    reason: row.reason ?? undefined,
  };
}
