import { fileURLToPath } from "url";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "plugin.db");
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const driveDB = new Database(dbPath);

driveDB
  .prepare(
    `
  CREATE TABLE IF NOT EXISTS oauth (
    plugin_id TEXT PRIMARY KEY,
  
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,

    access_token TEXT,
    refresh_token TEXT,
    scope TEXT,
    token_type TEXT,

    refresh_token_expires_in INTEGER,
    expiry_date INTEGER
  )
`,
  )
  .run();
