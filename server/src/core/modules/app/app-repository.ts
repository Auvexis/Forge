import { DatabaseManager } from "../../database/index.ts";

const db = DatabaseManager.app;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GlobalVariable {
  key: string;
  value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// ─── AppRepository ────────────────────────────────────────────────────────────

/**
 * Central repository for application-level configuration.
 *
 * Responsibilities:
 *  - Generic key-value settings (theme, server name, etc.)
 *  - Global variables accessible in workflows via {{env.KEY}}
 *
 * No plugin logic lives here. This is a pure core concern.
 */
export const AppRepository = {
  // ── Settings ──────────────────────────────────────────────────────────────

  getSetting(key: string): unknown | null {
    const row = db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(key) as { value: string } | undefined;

    if (!row) return null;

    try {
      return JSON.parse(row.value);
    } catch {
      return null;
    }
  },

  setSetting(key: string, value: unknown): void {
    db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).run(key, JSON.stringify(value));
  },

  getAllSettings(): Record<string, unknown> {
    const rows = db
      .prepare("SELECT key, value FROM settings ORDER BY key ASC")
      .all() as { key: string; value: string }[];

    const result: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = null;
      }
    }
    return result;
  },

  deleteSetting(key: string): void {
    db.prepare("DELETE FROM settings WHERE key = ?").run(key);
  },

  // ── Global Variables ──────────────────────────────────────────────────────

  /**
   * Returns all global variables as a flat key→value map.
   * Used by the workflow executor to populate the `env` context namespace.
   */
  getAllGlobalVariablesAsMap(): Record<string, string> {
    const rows = db
      .prepare("SELECT key, value FROM global_variables ORDER BY key ASC")
      .all() as { key: string; value: string }[];

    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  },

  /**
   * Returns all global variables with metadata (for the settings UI).
   */
  getAllGlobalVariables(): GlobalVariable[] {
    return db
      .prepare("SELECT * FROM global_variables ORDER BY key ASC")
      .all() as GlobalVariable[];
  },

  getGlobalVariable(key: string): GlobalVariable | null {
    const row = db
      .prepare("SELECT * FROM global_variables WHERE key = ?")
      .get(key) as GlobalVariable | undefined;

    return row ?? null;
  },

  setGlobalVariable(
    key: string,
    value: string,
    description = "",
  ): GlobalVariable {
    db.prepare(
      `INSERT INTO global_variables (key, value, description, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value       = excluded.value,
         description = excluded.description,
         updated_at  = excluded.updated_at`,
    ).run(key, value, description);

    return this.getGlobalVariable(key)!;
  },

  deleteGlobalVariable(key: string): void {
    db.prepare("DELETE FROM global_variables WHERE key = ?").run(key);
  },
};
