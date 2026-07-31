import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      rebuildArtifacts(db);
      rebuildPendingInteractions(db);
    })();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

export async function down(_db: Database.Database): Promise<void> {
  // The removed constraints target the superseded agent_actions table.
}

function rebuildArtifacts(db: Database.Database): void {
  if (!hasForeignKey(db, "agent_artifacts", "agent_actions")) return;
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_artifacts_expiry;
    ALTER TABLE agent_artifacts RENAME TO agent_artifacts_legacy;
    CREATE TABLE agent_artifacts (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      action_id TEXT,
      name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER NOT NULL,
      storage_key TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
      UNIQUE(profile_id, storage_key)
    );
    INSERT INTO agent_artifacts SELECT * FROM agent_artifacts_legacy;
    DROP TABLE agent_artifacts_legacy;
    CREATE INDEX idx_agent_artifacts_expiry
      ON agent_artifacts(profile_id, expires_at);
  `);
}

function rebuildPendingInteractions(db: Database.Database): void {
  if (!hasForeignKey(db, "agent_pending_interactions", "agent_actions")) return;
  db.exec(`
    DROP INDEX IF EXISTS idx_agent_pending_interactions_status;
    DROP INDEX IF EXISTS idx_agent_pending_interactions_active;
    ALTER TABLE agent_pending_interactions RENAME TO agent_pending_interactions_legacy;
    CREATE TABLE agent_pending_interactions (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      action_id TEXT,
      kind TEXT NOT NULL,
      question TEXT NOT NULL,
      context_json TEXT NOT NULL,
      status TEXT NOT NULL,
      response_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    );
    INSERT INTO agent_pending_interactions SELECT * FROM agent_pending_interactions_legacy;
    DROP TABLE agent_pending_interactions_legacy;
    CREATE UNIQUE INDEX idx_agent_pending_interactions_active
      ON agent_pending_interactions(run_id) WHERE status = 'pending';
    CREATE INDEX idx_agent_pending_interactions_status
      ON agent_pending_interactions(run_id, status, created_at);
  `);
}

function hasForeignKey(
  db: Database.Database,
  table: string,
  target: string,
): boolean {
  return (db.prepare(`PRAGMA foreign_key_list(${table})`).all() as Array<{ table: string }>)
    .some((foreignKey) => foreignKey.table === target);
}
