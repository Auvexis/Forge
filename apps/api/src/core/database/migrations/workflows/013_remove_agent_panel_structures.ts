import type Database from "better-sqlite3";
import { columnExists } from "../../sqlite-schema.ts";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_chat_sessions_agent_node;
    DROP INDEX IF EXISTS idx_agent_chat_sessions_agent_key;
  `);
  if (columnExists(db, "agent_chat_sessions", "agent_node_id")) {
    db.exec(`ALTER TABLE agent_chat_sessions DROP COLUMN agent_node_id;`);
  }
  if (columnExists(db, "agent_chat_sessions", "agent_key")) {
    db.exec(`ALTER TABLE agent_chat_sessions DROP COLUMN agent_key;`);
  }
}

export async function down(_db: Database.Database): Promise<void> {
  // Agent Panel identity columns were intentionally retired.
}
