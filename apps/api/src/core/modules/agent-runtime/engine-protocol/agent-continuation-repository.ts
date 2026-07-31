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

  update(input: {
    metadata: AgentContinuationMetadata;
    expectedRevision: number;
  }): AgentContinuationRecord {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      UPDATE agent_continuations
      SET metadata_json = ?, revision = revision + 1, updated_at = ?
      WHERE run_id = ? AND revision = ?
    `).run(
      JSON.stringify(input.metadata),
      now,
      input.metadata.runId,
      input.expectedRevision,
    );
    if (result.changes !== 1) {
      throw new Error(
        `Concurrent agent continuation update rejected: ${input.metadata.runId}`,
      );
    }
    return this.get(input.metadata.runId)!;
  }
}

interface AgentContinuationRow {
  run_id: string;
  metadata_json: string;
  revision: number;
  created_at: string;
  updated_at: string;
}
