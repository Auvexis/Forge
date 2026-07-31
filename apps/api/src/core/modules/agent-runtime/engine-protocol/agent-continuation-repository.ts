import type Database from "better-sqlite3";
import type { AgentContinuationMetadata } from "./agent-continuation-metadata.ts";

export interface AgentContinuationRecord {
  metadata: AgentContinuationMetadata;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export class AgentContinuationRepository {
  constructor(private readonly db: Database.Database) {}

  create(metadata: AgentContinuationMetadata): AgentContinuationRecord {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO agent_continuations (
        run_id, metadata_json, revision, created_at, updated_at
      ) VALUES (?, ?, 1, ?, ?)
    `).run(metadata.runId, JSON.stringify(metadata), now, now);
    return this.get(metadata.runId)!;
  }

  get(runId: string): AgentContinuationRecord | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_continuations WHERE run_id = ?
    `).get(runId) as AgentContinuationRow | undefined;
    return row
      ? {
          metadata: JSON.parse(row.metadata_json) as AgentContinuationMetadata,
          revision: row.revision,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }
}

interface AgentContinuationRow {
  run_id: string;
  metadata_json: string;
  revision: number;
  created_at: string;
  updated_at: string;
}
