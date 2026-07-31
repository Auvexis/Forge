import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { up } from "./migrations/workflows/023_remove_legacy_agent_action_foreign_keys.ts";

describe("023_remove_legacy_agent_action_foreign_keys", () => {
  it("removes planner action constraints while preserving rows", async () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE agent_runs (id TEXT PRIMARY KEY);
      CREATE TABLE agent_actions (id TEXT PRIMARY KEY);
      CREATE TABLE agent_artifacts (
        id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, run_id TEXT NOT NULL,
        action_id TEXT, name TEXT NOT NULL, mime_type TEXT, size INTEGER NOT NULL,
        storage_key TEXT NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
        FOREIGN KEY(action_id) REFERENCES agent_actions(id) ON DELETE SET NULL,
        UNIQUE(profile_id, storage_key)
      );
      CREATE TABLE agent_pending_interactions (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL, action_id TEXT, kind TEXT NOT NULL,
        question TEXT NOT NULL, context_json TEXT NOT NULL, status TEXT NOT NULL,
        response_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        resolved_at TEXT,
        FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
        FOREIGN KEY(action_id) REFERENCES agent_actions(id) ON DELETE CASCADE
      );
      INSERT INTO agent_runs VALUES ('run_1');
      INSERT INTO agent_actions VALUES ('legacy_action');
      INSERT INTO agent_artifacts VALUES (
        'artifact_1', 'profile_1', 'run_1', 'legacy_action', 'cv.pdf',
        'application/pdf', 10, 'key', 'sha', 'now', 'later'
      );
    `);

    await up(db);

    const artifactTargets = db.prepare("PRAGMA foreign_key_list(agent_artifacts)")
      .all() as Array<{ table: string }>;
    const interactionTargets = db.prepare("PRAGMA foreign_key_list(agent_pending_interactions)")
      .all() as Array<{ table: string }>;
    expect(artifactTargets.map(({ table }) => table)).toEqual(["agent_runs"]);
    expect(interactionTargets.map(({ table }) => table)).toEqual(["agent_runs"]);
    expect(db.prepare("SELECT action_id FROM agent_artifacts WHERE id = 'artifact_1'").get())
      .toEqual({ action_id: "legacy_action" });
  });
});
