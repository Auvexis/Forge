import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS agent_chat_sessions (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      trigger_node_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS agent_chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES agent_chat_sessions(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS agent_memories (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      namespace TEXT NOT NULL,
      memory_key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(profile_id, namespace, memory_key)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS agent_tool_approvals (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      execution_id TEXT NOT NULL,
      session_id TEXT,
      tool_name TEXT NOT NULL,
      request_json TEXT NOT NULL,
      status TEXT NOT NULL,
      decision_json TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    )
  `).run();
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare(`DROP TABLE IF EXISTS agent_tool_approvals`).run();
  db.prepare(`DROP TABLE IF EXISTS agent_memories`).run();
  db.prepare(`DROP TABLE IF EXISTS agent_chat_messages`).run();
  db.prepare(`DROP TABLE IF EXISTS agent_chat_sessions`).run();
}
