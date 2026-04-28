import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ─── Resolve data directory ───────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../../../../config/data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
 * Each key maps to an isolated SQLite file in config/data/.
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
