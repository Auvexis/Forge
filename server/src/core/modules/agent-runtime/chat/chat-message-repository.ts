import type Database from "better-sqlite3";

export type AgentChatMessageRole = "user" | "assistant" | "tool" | "system";

export interface AgentChatMessage {
  id: string;
  profileId: string;
  sessionId: string;
  role: AgentChatMessageRole;
  content: unknown;
  createdAt: string;
}

export interface AppendChatMessageInput {
  id: string;
  profileId: string;
  sessionId: string;
  role: AgentChatMessageRole;
  content: unknown;
}

export class ChatMessageRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  append(input: AppendChatMessageInput): AgentChatMessage {
    const createdAt = this.nextCreatedAt(input.profileId, input.sessionId);
    this.db
      .prepare(`
        INSERT INTO agent_chat_messages
          (id, session_id, profile_id, role, content_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.id,
        input.sessionId,
        input.profileId,
        input.role,
        JSON.stringify(input.content),
        createdAt,
      );

    return { ...input, createdAt };
  }

  listBySession(profileId: string, sessionId: string): AgentChatMessage[] {
    const rows = this.db
      .prepare(`
        SELECT * FROM agent_chat_messages
        WHERE profile_id = ? AND session_id = ?
        ORDER BY created_at ASC, id ASC
      `)
      .all(profileId, sessionId) as ChatMessageRow[];
    return rows.map(toChatMessage);
  }

  private nextCreatedAt(profileId: string, sessionId: string): string {
    const row = this.db
      .prepare(`
        SELECT MAX(created_at) AS created_at
        FROM agent_chat_messages
        WHERE profile_id = ? AND session_id = ?
      `)
      .get(profileId, sessionId) as { created_at: string | null } | undefined;
    const now = new Date();
    const previousTime = row?.created_at ? Date.parse(row.created_at) : NaN;
    if (!Number.isFinite(previousTime) || now.getTime() > previousTime) return now.toISOString();
    return new Date(previousTime + 1).toISOString();
  }
}

interface ChatMessageRow {
  id: string;
  profile_id: string;
  session_id: string;
  role: AgentChatMessageRole;
  content_json: string;
  created_at: string;
}

function toChatMessage(row: ChatMessageRow): AgentChatMessage {
  return {
    id: row.id,
    profileId: row.profile_id,
    sessionId: row.session_id,
    role: row.role,
    content: JSON.parse(row.content_json),
    createdAt: row.created_at,
  };
}
