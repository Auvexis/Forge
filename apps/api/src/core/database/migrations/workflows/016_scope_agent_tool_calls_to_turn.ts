import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_message_parts_tool_call;
    CREATE UNIQUE INDEX idx_agent_message_parts_tool_call
      ON agent_message_parts(turn_id, json_extract(data_json, '$.callId'))
      WHERE type = 'tool';
  `);
}

export async function down(db: Database.Database): Promise<void> {
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_message_parts_tool_call;
    CREATE UNIQUE INDEX idx_agent_message_parts_tool_call
      ON agent_message_parts(session_id, json_extract(data_json, '$.callId'))
      WHERE type = 'tool';
  `);
}
