import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/**
 * Path to the database file
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../../../config/data/forge.db");

/**
 * Creates the directory if it doesn't exist
 */
const dataDir = path.join(__dirname, "../../../config/data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

/**
 * Workflows Tables
 */
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    is_public INTEGER DEFAULT 0,
    is_draft INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    definition JSON NOT NULL
  )
`
).run();

/**
 * Migration: add is_draft column to existing workflows table
 */
try {
  db.prepare(`ALTER TABLE workflows ADD COLUMN is_draft INTEGER DEFAULT 0`).run();
} catch {
  // Column already exists — safe to ignore
}

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    context_state JSON,
    FOREIGN KEY(workflow_id) REFERENCES workflows(id)
  )
`
).run();
