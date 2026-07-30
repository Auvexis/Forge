import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.transaction(() => {
    if (!columnExists(db, "agent_chat_sessions", "revision")) {
      db.exec(`
        ALTER TABLE agent_chat_sessions
        ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
      `);
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_session_turns (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        run_id TEXT,
        state TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY(session_id) REFERENCES agent_chat_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE SET NULL,
        UNIQUE(session_id, sequence)
      );

      CREATE INDEX IF NOT EXISTS idx_agent_session_turns_active
        ON agent_session_turns(session_id, state, sequence DESC);

      CREATE TABLE IF NOT EXISTS agent_session_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        turn_id TEXT NOT NULL,
        role TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY(session_id) REFERENCES agent_chat_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY(turn_id) REFERENCES agent_session_turns(id) ON DELETE CASCADE,
        UNIQUE(session_id, sequence)
      );

      CREATE INDEX IF NOT EXISTS idx_agent_session_messages_page
        ON agent_session_messages(session_id, sequence);

      CREATE TABLE IF NOT EXISTS agent_message_parts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        turn_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        type TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES agent_chat_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY(turn_id) REFERENCES agent_session_turns(id) ON DELETE CASCADE,
        FOREIGN KEY(message_id) REFERENCES agent_session_messages(id) ON DELETE CASCADE,
        UNIQUE(message_id, sequence)
      );

      CREATE INDEX IF NOT EXISTS idx_agent_message_parts_message
        ON agent_message_parts(message_id, sequence);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_message_parts_tool_call
        ON agent_message_parts(session_id, json_extract(data_json, '$.callId'))
        WHERE type = 'tool';

      CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_message_parts_interaction
        ON agent_message_parts(session_id, json_extract(data_json, '$.interactionId'))
        WHERE type = 'interaction';
    `);
  })();
}

export async function down(db: Database.Database): Promise<void> {
  db.transaction(() => {
    db.exec(`
      DROP INDEX IF EXISTS idx_agent_message_parts_interaction;
      DROP INDEX IF EXISTS idx_agent_message_parts_tool_call;
      DROP INDEX IF EXISTS idx_agent_message_parts_message;
      DROP TABLE IF EXISTS agent_message_parts;
      DROP INDEX IF EXISTS idx_agent_session_messages_page;
      DROP TABLE IF EXISTS agent_session_messages;
      DROP INDEX IF EXISTS idx_agent_session_turns_active;
      DROP TABLE IF EXISTS agent_session_turns;
    `);
  })();
}

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((candidate) => candidate.name === column);
}
