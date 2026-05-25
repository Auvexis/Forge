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
    const createdAt = new Date().toISOString();
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
