import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_agent_message_parts_interaction;
        DROP INDEX IF EXISTS idx_agent_message_parts_tool_call;
        DROP INDEX IF EXISTS idx_agent_message_parts_message;
        DROP INDEX IF EXISTS idx_agent_session_messages_page;
        DROP INDEX IF EXISTS idx_agent_session_turns_active;
        DROP TABLE IF EXISTS agent_message_parts;
        DROP TABLE IF EXISTS agent_session_messages;
        DROP TABLE IF EXISTS agent_session_turns;
        DROP TABLE IF EXISTS agent_chat_messages;
        DROP TABLE IF EXISTS agent_chat_sessions;

        CREATE TABLE agent_sessions (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          workflow_id TEXT NOT NULL,
          trigger_node_id TEXT NOT NULL,
          title TEXT NOT NULL,
          state TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX idx_agent_sessions_workflow
          ON agent_sessions(profile_id, workflow_id, updated_at DESC);

        CREATE TABLE agent_session_turns (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          run_id TEXT,
          state TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          FOREIGN KEY(session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE SET NULL,
          UNIQUE(session_id, sequence)
        );

        CREATE INDEX idx_agent_session_turns_active
          ON agent_session_turns(session_id, state, sequence DESC);

        CREATE TABLE agent_session_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          turn_id TEXT NOT NULL,
          role TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          completed_at TEXT,
          FOREIGN KEY(session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY(turn_id) REFERENCES agent_session_turns(id) ON DELETE CASCADE,
          UNIQUE(session_id, sequence)
        );

        CREATE INDEX idx_agent_session_messages_page
          ON agent_session_messages(session_id, sequence);

        CREATE TABLE agent_message_parts (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          turn_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          type TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          data_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY(turn_id) REFERENCES agent_session_turns(id) ON DELETE CASCADE,
          FOREIGN KEY(message_id) REFERENCES agent_session_messages(id) ON DELETE CASCADE,
          UNIQUE(message_id, sequence)
        );

        CREATE INDEX idx_agent_message_parts_message
          ON agent_message_parts(message_id, sequence);

        CREATE UNIQUE INDEX idx_agent_message_parts_tool_call
          ON agent_message_parts(turn_id, json_extract(data_json, '$.callId'))
          WHERE type = 'tool';

        CREATE UNIQUE INDEX idx_agent_message_parts_interaction
          ON agent_message_parts(session_id, json_extract(data_json, '$.interactionId'))
          WHERE type = 'interaction';
      `);
    })();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

export async function down(db: Database.Database): Promise<void> {
  db.pragma("foreign_keys = OFF");
  try {
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
        DROP INDEX IF EXISTS idx_agent_sessions_workflow;
        DROP TABLE IF EXISTS agent_sessions;
      `);
    })();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}
