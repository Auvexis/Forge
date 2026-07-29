import type Database from "better-sqlite3";
import type { AgentArtifactRecord } from "../contracts/agent-domain-contracts.ts";

export interface CreateAgentArtifactInput {
  id: string;
  profileId: string;
  runId: string;
  actionId?: string;
  name: string;
  mimeType?: string;
  size: number;
  storageKey: string;
  sha256: string;
  expiresAt: string;
}

export class AgentArtifactRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateAgentArtifactInput): AgentArtifactRecord {
    const createdAt = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO agent_artifacts (
        id, profile_id, run_id, action_id, name, mime_type, size,
        storage_key, sha256, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.profileId,
      input.runId,
      input.actionId ?? null,
      input.name,
      input.mimeType ?? null,
      input.size,
      input.storageKey,
      input.sha256,
      createdAt,
      input.expiresAt,
    );
    return this.getById(input.profileId, input.id)!;
  }

  getById(profileId: string, id: string): AgentArtifactRecord | null {
    const row = this.db.prepare(`
      SELECT * FROM agent_artifacts WHERE profile_id = ? AND id = ?
    `).get(profileId, id) as ArtifactRow | undefined;
    return row ? toArtifact(row) : null;
  }

  listExpired(profileId: string, now: string, limit = 100): AgentArtifactRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM agent_artifacts
      WHERE profile_id = ? AND expires_at <= ?
      ORDER BY expires_at ASC
      LIMIT ?
    `).all(profileId, now, limit) as ArtifactRow[];
    return rows.map(toArtifact);
  }

  deleteById(profileId: string, id: string): boolean {
    return this.db.prepare(`
      DELETE FROM agent_artifacts WHERE profile_id = ? AND id = ?
    `).run(profileId, id).changes === 1;
  }
}

interface ArtifactRow {
  id: string;
  profile_id: string;
  run_id: string;
  action_id: string | null;
  name: string;
  mime_type: string | null;
  size: number;
  storage_key: string;
  sha256: string;
  created_at: string;
  expires_at: string;
}

function toArtifact(row: ArtifactRow): AgentArtifactRecord {
  return {
    id: row.id,
    ref: `artifact://${row.id}`,
    profileId: row.profile_id,
    runId: row.run_id,
    actionId: row.action_id ?? undefined,
    name: row.name,
    mimeType: row.mime_type ?? undefined,
    size: row.size,
    storageKey: row.storage_key,
    sha256: row.sha256,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}
