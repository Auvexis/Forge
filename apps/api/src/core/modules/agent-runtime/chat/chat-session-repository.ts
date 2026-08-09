import type Database from "better-sqlite3";

export interface AgentChatSession {
  id: string;
  profileId: string;
  workflowId: string;
  triggerNodeId: string;
  title: string;
  status: string;
  revision?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatSessionInput {
  id: string;
  profileId: string;
  workflowId: string;
  triggerNodeId: string;
  title: string;
  status: string;
}

export class ChatSessionRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  create(input: CreateChatSessionInput): AgentChatSession {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        INSERT INTO agent_sessions
          (id, profile_id, workflow_id, trigger_node_id, title, state, revision, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `)
      .run(
        input.id,
        input.profileId,
        input.workflowId,
        input.triggerNodeId,
        input.title,
        input.status,
        now,
        now,
      );

    return {
      ...input,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  getById(profileId: string, id: string): AgentChatSession | null {
    const row = this.db
      .prepare(`SELECT * FROM agent_sessions WHERE profile_id = ? AND id = ?`)
      .get(profileId, id) as ChatSessionRow | undefined;
    return row ? toChatSession(row) : null;
  }

  listByWorkflow(profileId: string, workflowId: string): AgentChatSession[] {
    const rows = this.db
      .prepare(`
        SELECT * FROM agent_sessions
        WHERE profile_id = ? AND workflow_id = ?
        ORDER BY updated_at DESC
      `)
      .all(profileId, workflowId) as ChatSessionRow[];
    return rows.map(toChatSession);
  }

  touch(profileId: string, id: string): void {
    this.db
      .prepare(`
        UPDATE agent_sessions
        SET updated_at = ?, revision = revision + 1
        WHERE profile_id = ? AND id = ?
      `)
      .run(new Date().toISOString(), profileId, id);
  }

  rename(profileId: string, id: string, title: string): AgentChatSession | null {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(`
        UPDATE agent_sessions
        SET title = ?, updated_at = ?, revision = revision + 1
        WHERE profile_id = ? AND id = ?
      `)
      .run(title, now, profileId, id);
    if (result.changes === 0) return null;
    return this.getById(profileId, id);
  }

  delete(profileId: string, id: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM agent_sessions WHERE profile_id = ? AND id = ?`)
      .run(profileId, id);
    return result.changes > 0;
  }
}

interface ChatSessionRow {
  id: string;
  profile_id: string;
  workflow_id: string;
  trigger_node_id: string;
  title: string;
  state: string;
  revision: number;
  created_at: string;
  updated_at: string;
}

function toChatSession(row: ChatSessionRow): AgentChatSession {
  return {
    id: row.id,
    profileId: row.profile_id,
    workflowId: row.workflow_id,
    triggerNodeId: row.trigger_node_id,
    title: row.title,
    status: row.state,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
