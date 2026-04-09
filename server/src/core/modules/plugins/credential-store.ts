import { fileURLToPath } from "url";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";
import type {
  OAuth2Tokens,
  PluginAuthType,
  PluginStatus,
} from "../../../shared/models/plugin-types.ts";

// ─── Database Setup ──────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../../../../../config/data/credentials.db");
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS plugin_credentials (
    plugin_id TEXT PRIMARY KEY,
    fields TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`,
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS plugin_tokens (
    plugin_id TEXT PRIMARY KEY,
    tokens TEXT NOT NULL DEFAULT '{}',
    expires_at INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`,
).run();

// ──────────── Credential Store ────────────

export const CredentialStore = {
  // ──────────── Credentials (client_id, client_secret, api_key, etc) ────────────

  getCredentials(pluginId: string): Record<string, string> | null {
    const row = db
      .prepare("SELECT fields FROM plugin_credentials WHERE plugin_id = ?")
      .get(pluginId) as { fields: string } | undefined;

    if (!row) return null;

    try {
      return JSON.parse(row.fields);
    } catch {
      return null;
    }
  },

  saveCredentials(pluginId: string, fields: Record<string, string>): void {
    const existing = db
      .prepare("SELECT plugin_id FROM plugin_credentials WHERE plugin_id = ?")
      .get(pluginId);

    if (existing) {
      db.prepare(
        "UPDATE plugin_credentials SET fields = ?, updated_at = datetime('now') WHERE plugin_id = ?",
      ).run(JSON.stringify(fields), pluginId);
    } else {
      db.prepare(
        "INSERT INTO plugin_credentials (plugin_id, fields) VALUES (?, ?)",
      ).run(pluginId, JSON.stringify(fields));
    }
  },

  deleteCredentials(pluginId: string): void {
    db.prepare("DELETE FROM plugin_credentials WHERE plugin_id = ?").run(
      pluginId,
    );
    // Also delete tokens when credentials are removed
    this.deleteTokens(pluginId);
  },

  // ── OAuth2 Tokens ──

  getTokens(pluginId: string): OAuth2Tokens | null {
    const row = db
      .prepare("SELECT tokens FROM plugin_tokens WHERE plugin_id = ?")
      .get(pluginId) as { tokens: string } | undefined;

    if (!row) return null;

    try {
      return JSON.parse(row.tokens);
    } catch {
      return null;
    }
  },

  saveTokens(pluginId: string, tokens: OAuth2Tokens): void {
    const existing = db
      .prepare("SELECT plugin_id FROM plugin_tokens WHERE plugin_id = ?")
      .get(pluginId);

    if (existing) {
      db.prepare(
        "UPDATE plugin_tokens SET tokens = ?, expires_at = ?, updated_at = datetime('now') WHERE plugin_id = ?",
      ).run(JSON.stringify(tokens), tokens.expires_at ?? null, pluginId);
    } else {
      db.prepare(
        "INSERT INTO plugin_tokens (plugin_id, tokens, expires_at) VALUES (?, ?, ?)",
      ).run(pluginId, JSON.stringify(tokens), tokens.expires_at ?? null);
    }
  },

  deleteTokens(pluginId: string): void {
    db.prepare("DELETE FROM plugin_tokens WHERE plugin_id = ?").run(pluginId);
  },

  // ── Status ──

  getPluginStatus(pluginId: string, authType: PluginAuthType): PluginStatus {
    if (authType === "none") return "connected";

    const credentials = this.getCredentials(pluginId);
    if (!credentials || Object.keys(credentials).length === 0) {
      return "not_configured";
    }

    if (authType === "api_key") {
      return "configured";
    }

    // oauth2: check if tokens exist
    const tokens = this.getTokens(pluginId);
    if (!tokens || !tokens.access_token) {
      return "configured";
    }

    return "connected";
  },

  // ── Mask secrets for frontend display ──

  maskCredentials(
    credentials: Record<string, string>,
    sensitiveFields: string[],
  ): Record<string, string> {
    const masked = { ...credentials };
    for (const field of sensitiveFields) {
      if (masked[field]) {
        const value = masked[field];
        if (value.length > 8) {
          masked[field] = value.slice(0, 4) + "••••" + value.slice(-4);
        } else {
          masked[field] = "••••••••";
        }
      }
    }
    return masked;
  },
};
