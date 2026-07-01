import type Database from "better-sqlite3";

export interface AgentMemoryRecord {
  id: string;
  profileId: string;
  namespace: string;
  key: string;
  value: unknown;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface PutAgentMemoryInput {
  id: string;
  profileId: string;
  namespace: string;
  key: string;
  value: unknown;
  source: string;
}

export interface SearchAgentMemoryInput {
  profileId: string;
  namespace: string;
  limit?: number;
}

export class AgentMemoryStore {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  put(input: PutAgentMemoryInput): AgentMemoryRecord {
    const existing = this.getByKey(input.profileId, input.namespace, input.key);
    const now = nextTimestamp(existing?.updatedAt);
    const id = existing?.id ?? input.id;
    const createdAt = existing?.createdAt ?? now;

    this.db
      .prepare(`
        INSERT INTO agent_memories
          (id, profile_id, namespace, memory_key, value_json, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, namespace, memory_key) DO UPDATE SET
          value_json = excluded.value_json,
          source = excluded.source,
          updated_at = excluded.updated_at
      `)
      .run(
        id,
        input.profileId,
        input.namespace,
        input.key,
        JSON.stringify(input.value),
        input.source,
        createdAt,
        now,
      );

    return {
      id,
      profileId: input.profileId,
      namespace: input.namespace,
      key: input.key,
      value: input.value,
      source: input.source,
      createdAt,
      updatedAt: now,
    };
  }

  search(input: SearchAgentMemoryInput): AgentMemoryRecord[] {
    const rows = this.db
      .prepare(`
        SELECT * FROM agent_memories
        WHERE profile_id = ? AND namespace = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `)
      .all(input.profileId, input.namespace, input.limit ?? 50) as AgentMemoryRow[];
    return rows.map(toMemoryRecord);
  }

  delete(profileId: string, namespace: string, key: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM agent_memories WHERE profile_id = ? AND namespace = ? AND memory_key = ?`)
      .run(profileId, namespace, key);
    return result.changes > 0;
  }

  private getByKey(profileId: string, namespace: string, key: string): AgentMemoryRecord | null {
    const row = this.db
      .prepare(`
        SELECT * FROM agent_memories
        WHERE profile_id = ? AND namespace = ? AND memory_key = ?
      `)
      .get(profileId, namespace, key) as AgentMemoryRow | undefined;
    return row ? toMemoryRecord(row) : null;
  }
}

interface AgentMemoryRow {
  id: string;
  profile_id: string;
  namespace: string;
  memory_key: string;
  value_json: string;
  source: string;
  created_at: string;
  updated_at: string;
}

function toMemoryRecord(row: AgentMemoryRow): AgentMemoryRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    namespace: row.namespace,
    key: row.memory_key,
    value: JSON.parse(row.value_json),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nextTimestamp(previous?: string): string {
  const now = new Date();
  if (!previous) return now.toISOString();

  const previousTime = Date.parse(previous);
  if (!Number.isFinite(previousTime) || now.getTime() > previousTime) {
    return now.toISOString();
  }

  return new Date(previousTime + 1).toISOString();
}
