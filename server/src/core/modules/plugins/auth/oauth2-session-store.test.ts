import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { OAuth2SessionStore } from "./oauth2-session-store.ts";

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.prepare(
    `
    CREATE TABLE oauth2_auth_sessions (
      state TEXT PRIMARY KEY NOT NULL,
      plugin_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_verifier TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `,
  ).run();
  return db;
}

describe("OAuth2SessionStore", () => {
  it("saves and consumes a session by state", () => {
    const db = createDb();
    const store = new OAuth2SessionStore(db, { now: () => 1_000 });

    store.save({
      state: "state-123",
      pluginId: "demo",
      redirectUri: "https://sailor.example/callback",
      codeVerifier: "verifier",
      ttlMs: 60_000,
    });

    assert.deepEqual(store.consume("state-123"), {
      state: "state-123",
      pluginId: "demo",
      redirectUri: "https://sailor.example/callback",
      codeVerifier: "verifier",
      createdAt: 1_000,
      expiresAt: 61_000,
    });
    db.close();
  });

  it("prevents state reuse", () => {
    const db = createDb();
    const store = new OAuth2SessionStore(db, { now: () => 1_000 });

    store.save({
      state: "state-123",
      pluginId: "demo",
      redirectUri: "https://sailor.example/callback",
      ttlMs: 60_000,
    });

    assert.notEqual(store.consume("state-123"), null);
    assert.equal(store.consume("state-123"), null);
    db.close();
  });

  it("ignores expired sessions", () => {
    const db = createDb();
    const store = new OAuth2SessionStore(db, { now: () => 100_000 });

    store.save({
      state: "state-123",
      pluginId: "demo",
      redirectUri: "https://sailor.example/callback",
      ttlMs: -1,
    });

    assert.equal(store.consume("state-123"), null);
    db.close();
  });
});
