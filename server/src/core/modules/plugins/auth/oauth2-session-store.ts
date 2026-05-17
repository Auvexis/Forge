import type Database from "better-sqlite3";
import { DatabaseManager } from "../../../database/index.ts";

interface OAuth2SessionStoreDependencies {
  now?: () => number;
}

type OAuth2SessionDatabaseProvider = () => Database.Database;

let oauth2SessionDatabaseProvider: OAuth2SessionDatabaseProvider = () => DatabaseManager.credentials;

export function setOAuth2SessionDatabaseProvider(provider: OAuth2SessionDatabaseProvider): void {
  oauth2SessionDatabaseProvider = provider;
}

export function resetOAuth2SessionDatabaseProvider(): void {
  oauth2SessionDatabaseProvider = () => DatabaseManager.credentials;
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
  private readonly databaseProvider: OAuth2SessionDatabaseProvider;
  private readonly now: () => number;

  constructor(db: Database.Database = DatabaseManager.credentials, dependencies: OAuth2SessionStoreDependencies = {}) {
    this.databaseProvider = () => db;
    this.now = dependencies.now ?? Date.now;
  }

  save(input: SaveOAuth2SessionInput): void {
    const createdAt = this.now();
    this.databaseProvider()
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
    const row = this.databaseProvider()
      .prepare("SELECT * FROM oauth2_auth_sessions WHERE state = ?")
      .get(state) as OAuth2AuthSessionRow | undefined;

    this.databaseProvider().prepare("DELETE FROM oauth2_auth_sessions WHERE state = ?").run(state);

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

class OAuth2SessionStoreProxy {
  save(input: SaveOAuth2SessionInput): void {
    new OAuth2SessionStore(oauth2SessionDatabaseProvider()).save(input);
  }

  consume(state: string): OAuth2AuthSession | null {
    return new OAuth2SessionStore(oauth2SessionDatabaseProvider()).consume(state);
  }
}

export const oauth2SessionStore = new OAuth2SessionStoreProxy();
