import type Database from "better-sqlite3";

export type AgentApprovalStatus = "pending" | "approved" | "rejected";

export interface AgentToolApproval {
  id: string;
  profileId: string;
  workflowId: string;
  executionId: string;
  sessionId?: string;
  toolName: string;
  request: unknown;
  status: AgentApprovalStatus;
  decision?: unknown;
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateAgentApprovalInput {
  id: string;
  profileId: string;
  workflowId: string;
  executionId: string;
  sessionId?: string;
  toolName: string;
  request: unknown;
}

export class AgentApprovalService {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  create(input: CreateAgentApprovalInput): AgentToolApproval {
    const createdAt = new Date().toISOString();
    this.db
      .prepare(`
        INSERT INTO agent_tool_approvals
          (id, profile_id, workflow_id, execution_id, session_id, tool_name, request_json, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.id,
        input.profileId,
        input.workflowId,
        input.executionId,
        input.sessionId ?? null,
        input.toolName,
        JSON.stringify(input.request),
        "pending",
        createdAt,
      );

    return {
      ...input,
      status: "pending",
      createdAt,
    };
  }

  getById(profileId: string, id: string): AgentToolApproval | null {
    const row = this.db
      .prepare(`SELECT * FROM agent_tool_approvals WHERE profile_id = ? AND id = ?`)
      .get(profileId, id) as AgentToolApprovalRow | undefined;
    return row ? toApproval(row) : null;
  }

  resolve(
    profileId: string,
    id: string,
    input: { status: Exclude<AgentApprovalStatus, "pending">; decision?: unknown },
  ): AgentToolApproval | null {
    const resolvedAt = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE agent_tool_approvals
        SET status = ?, decision_json = ?, resolved_at = ?
        WHERE profile_id = ? AND id = ? AND status = 'pending'
      `)
      .run(input.status, JSON.stringify(input.decision ?? null), resolvedAt, profileId, id);

    return this.getById(profileId, id);
  }
}

interface AgentToolApprovalRow {
  id: string;
  profile_id: string;
  workflow_id: string;
  execution_id: string;
  session_id: string | null;
  tool_name: string;
  request_json: string;
  status: AgentApprovalStatus;
  decision_json: string | null;
  created_at: string;
  resolved_at: string | null;
}

function toApproval(row: AgentToolApprovalRow): AgentToolApproval {
  return {
    id: row.id,
    profileId: row.profile_id,
    workflowId: row.workflow_id,
    executionId: row.execution_id,
    sessionId: row.session_id ?? undefined,
    toolName: row.tool_name,
    request: JSON.parse(row.request_json),
    status: row.status,
    decision: row.decision_json ? JSON.parse(row.decision_json) : undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}
