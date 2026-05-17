import { DatabaseManager } from "../../database/index.ts";
import type {
  CredentialSchema,
  OAuth2Tokens,
  PluginAuthType,
  PluginStatus,
} from "@auvexis/sailor-sdk";
import type Database from "better-sqlite3";

// ─── Database Connection ──────────────────────────────────────────────────────

type CredentialsDatabaseProvider = () => Database.Database;

let credentialsDatabaseProvider: CredentialsDatabaseProvider = () => DatabaseManager.credentials;

export function setCredentialsDatabaseProvider(provider: CredentialsDatabaseProvider): void {
  credentialsDatabaseProvider = provider;
}

export function resetCredentialsDatabaseProvider(): void {
  credentialsDatabaseProvider = () => DatabaseManager.credentials;
}

function getCredentialsDatabase(): Database.Database {
  return credentialsDatabaseProvider();
}

export function isMaskedCredentialValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.includes("\u2022") || value.includes("\u00e2\u20ac\u00a2"))
  );
}

// ──────────── Credential Store ────────────

export const CredentialStore = {
  // ──────────── Credentials (client_id, client_secret, api_key, etc) ────────────

  getCredentials(pluginId: string): Record<string, string> | null {
    const row = getCredentialsDatabase()
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
    const existing = getCredentialsDatabase()
      .prepare("SELECT plugin_id FROM plugin_credentials WHERE plugin_id = ?")
      .get(pluginId);

    if (existing) {
      getCredentialsDatabase().prepare(
        "UPDATE plugin_credentials SET fields = ?, updated_at = datetime('now') WHERE plugin_id = ?",
      ).run(JSON.stringify(fields), pluginId);
    } else {
      getCredentialsDatabase().prepare(
        "INSERT INTO plugin_credentials (plugin_id, fields) VALUES (?, ?)",
      ).run(pluginId, JSON.stringify(fields));
    }
  },

  deleteCredentials(pluginId: string): void {
    getCredentialsDatabase().prepare("DELETE FROM plugin_credentials WHERE plugin_id = ?").run(
      pluginId,
    );
    // Also delete tokens when credentials are removed
    this.deleteTokens(pluginId);
  },

  // ── OAuth2 Tokens ──

  getTokens(pluginId: string): OAuth2Tokens | null {
    const row = getCredentialsDatabase()
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
    const existing = getCredentialsDatabase()
      .prepare("SELECT plugin_id FROM plugin_tokens WHERE plugin_id = ?")
      .get(pluginId);

    if (existing) {
      getCredentialsDatabase().prepare(
        "UPDATE plugin_tokens SET tokens = ?, expires_at = ?, updated_at = datetime('now') WHERE plugin_id = ?",
      ).run(JSON.stringify(tokens), tokens.expires_at ?? null, pluginId);
    } else {
      getCredentialsDatabase().prepare(
        "INSERT INTO plugin_tokens (plugin_id, tokens, expires_at) VALUES (?, ?, ?)",
      ).run(pluginId, JSON.stringify(tokens), tokens.expires_at ?? null);
    }
  },

  deleteTokens(pluginId: string): void {
    getCredentialsDatabase().prepare("DELETE FROM plugin_tokens WHERE plugin_id = ?").run(pluginId);
  },

  // ── Status ──

  getPluginStatus(
    pluginId: string,
    authType: PluginAuthType,
    schema?: CredentialSchema,
  ): PluginStatus {
    const credentials = this.getCredentials(pluginId);

    // Check if configuration exists
    const hasConfig = credentials && Object.keys(credentials).length > 0;

    if (authType === "none") {
      if (!schema) return "connected";
      return hasConfig ? "connected" : "not_configured";
    }

    if (!hasConfig) {
      return "not_configured";
    }

    if (authType === "api_key") {
      return "connected";
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
