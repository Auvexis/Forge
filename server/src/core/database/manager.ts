import Database from "better-sqlite3";
import path from "path";
import { ensureSailorHomeStructure, sailorHomePaths } from "../runtime/sailor-home.ts";
import { prepareSailorDataDirectory } from "../runtime/sailor-data-directory.ts";

// ─── Resolve data directory ───────────────────────────────────────────────────

ensureSailorHomeStructure(sailorHomePaths);
const dataPreparation = prepareSailorDataDirectory({ dataDir: sailorHomePaths.dataDir });

if (dataPreparation.copied) {
  console.log(
    `[SAILOR | RUNTIME]: Copied legacy databases into ${sailorHomePaths.dataDir}: ${dataPreparation.files.join(", ")}`,
  );
}

const DATA_DIR = sailorHomePaths.dataDir;

// ─── Factory ──────────────────────────────────────────────────────────────────

function openDatabase(filename: string): Database.Database {
  const dbPath = path.join(DATA_DIR, filename);
  const instance = new Database(dbPath);

  // WAL = best performance for concurrent reads + writes
  instance.pragma("journal_mode = WAL");
  // Enforce referential integrity
  instance.pragma("foreign_keys = ON");

  return instance;
}

// ─── Named Connections ────────────────────────────────────────────────────────

/**
 * Central Database Manager.
 *
 * Each key maps to an isolated SQLite file in SAILOR_HOME/data.
 * Consumers import this object instead of opening their own connections.
 *
 * @example
 *   import { DatabaseManager } from '../database/manager.ts';
 *   const row = DatabaseManager.workflows.prepare('SELECT ...').get();
 */
export const DatabaseManager = {
  /** Global application settings (key-value) */
  app: openDatabase("app.db"),
  /** Workflows and execution logs */
  workflows: openDatabase("workflows.db"),
  /** Plugin registry (installed, enabled status, version) */
  plugins: openDatabase("plugins.db"),
  /** Plugin credentials and OAuth2 tokens */
  credentials: openDatabase("credentials.db"),
} as const;

export function getDatabaseDirectory(): string {
  return DATA_DIR;
}

export function closeDatabases(): void {
  for (const db of Object.values(DatabaseManager)) {
    if (db.open) {
      db.close();
    }
  }
}
