import type Database from "better-sqlite3";
import { addColumnIfMissing } from "../../sqlite-schema.ts";

export async function up(db: Database.Database): Promise<void> {
  addColumnIfMissing(db, "agent_chat_sessions", "agent_node_id", "TEXT");
  addColumnIfMissing(db, "agent_chat_sessions", "agent_key", "TEXT");

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_agent_chat_sessions_agent_key
    ON agent_chat_sessions(profile_id, agent_key, updated_at)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_agent_chat_sessions_agent_node
    ON agent_chat_sessions(profile_id, workflow_id, trigger_node_id, agent_node_id)
  `).run();
}

export async function down(db: Database.Database): Promise<void> {
  db.prepare(`DROP INDEX IF EXISTS idx_agent_chat_sessions_agent_node`).run();
  db.prepare(`DROP INDEX IF EXISTS idx_agent_chat_sessions_agent_key`).run();
}
