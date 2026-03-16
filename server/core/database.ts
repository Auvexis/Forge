import Database from "better-sqlite3";
import path from "path";

/**
 * Path to the database file
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../../config/data/forge.db");

/**
 * Creates the directory if it doesn't exist
 */
import fs from "fs";
import { fileURLToPath } from "url";
const dataDir = path.join(__dirname, "../../config/data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

/**
 * Ollama Config Table
 */
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS ollama_config (
    model TEXT NOT NULL,
    host TEXT NOT NULL,
    options TEXT
  )
`,
).run();

/**
 * Plugins Table
 */
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    icon TEXT,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL,
    author TEXT NOT NULL,
    repository TEXT,
    enabled INTEGER DEFAULT 0,
    config TEXT
  )
`,
).run();

/**
 * Plugins OAuth Table
 */
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS plugin_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    provider TEXT NOT NULL,

    access_token TEXT,
    refresh_token TEXT,
    expires_at INTEGER,

    metadata TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),

    FOREIGN KEY (plugin_id)
    REFERENCES plugins(id)
    ON DELETE CASCADE
  )
`,
).run();
