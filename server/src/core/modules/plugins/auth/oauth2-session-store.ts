import type Database from "better-sqlite3";
import { DatabaseManager } from "../../../database/index.ts";

interface OAuth2SessionStoreDependencies {
  now?: () => number;
}

export interface SaveOAuth2SessionInput {
  state: string;
  pluginId: string;
  redirectUri: string;
  codeVerifier?: string;
  ttlMs: number;
}

export interface OAuth2AuthSession {
  state: string;
  pluginId: string;
  redirectUri: string;
  codeVerifier?: string;
  createdAt: number;
  expiresAt: number;
}

interface OAuth2AuthSessionRow {
  state: string;
  plugin_id: string;
  redirect_uri: string;
  code_verifier: string | null;
  created_at: number;
  expires_at: number;
}

export class OAuth2SessionStore {
  private readonly db: Database.Database;
  private readonly now: () => number;

  constructor(db: Database.Database = DatabaseManager.credentials, dependencies: OAuth2SessionStoreDependencies = {}) {
    this.db = db;
    this.now = dependencies.now ?? Date.now;
  }

  save(input: SaveOAuth2SessionInput): void {
    const createdAt = this.now();
    this.db
      .prepare(
        `
        INSERT INTO oauth2_auth_sessions
          (state, plugin_id, redirect_uri, code_verifier, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        input.state,
        input.pluginId,
        input.redirectUri,
        input.codeVerifier ?? null,
        createdAt,
        createdAt + input.ttlMs,
      );
  }

  consume(state: string): OAuth2AuthSession | null {
    const row = this.db
      .prepare("SELECT * FROM oauth2_auth_sessions WHERE state = ?")
      .get(state) as OAuth2AuthSessionRow | undefined;

    this.db.prepare("DELETE FROM oauth2_auth_sessions WHERE state = ?").run(state);

    if (!row || row.expires_at <= this.now()) {
      return null;
    }

    return {
      state: row.state,
      pluginId: row.plugin_id,
      redirectUri: row.redirect_uri,
      codeVerifier: row.code_verifier ?? undefined,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }
}

export const oauth2SessionStore = new OAuth2SessionStore();
