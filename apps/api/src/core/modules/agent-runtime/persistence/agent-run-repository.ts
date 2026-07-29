import type Database from "better-sqlite3";
import type { AgentRunRecord, AgentRunState } from "../contracts/agent-domain-contracts.ts";

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
