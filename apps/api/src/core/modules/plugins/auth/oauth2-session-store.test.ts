import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import {
  oauth2SessionStore,
  OAuth2SessionStore,
  resetOAuth2SessionDatabaseProvider,
  setOAuth2SessionDatabaseProvider,
} from "./oauth2-session-store.ts";

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
  afterEach(() => {
    resetOAuth2SessionDatabaseProvider();
  });

  it("saves and consumes a session by state", () => {
    const db = createDb();
    const store = new OAuth2SessionStore(db, { now: () => 1_000 });

    store.save({
      state: "state-123",
      pluginId: "demo",
      redirectUri: "https://fabric.example/callback",
      codeVerifier: "verifier",
      ttlMs: 60_000,
    });

    assert.deepEqual(store.consume("state-123"), {
      state: "state-123",
      pluginId: "demo",
      redirectUri: "https://fabric.example/callback",
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
      redirectUri: "https://fabric.example/callback",
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
      redirectUri: "https://fabric.example/callback",
      ttlMs: -1,
    });

    assert.equal(store.consume("state-123"), null);
    db.close();
  });

  it("uses the active database provider so auth sessions stay isolated by profile", () => {
    const profileA = createDb();
    const profileB = createDb();

    setOAuth2SessionDatabaseProvider(() => profileA);
    oauth2SessionStore.save({
      state: "state-a",
      pluginId: "github",
      redirectUri: "https://fabric.example/a",
      ttlMs: 60_000,
    });

    setOAuth2SessionDatabaseProvider(() => profileB);
    assert.equal(oauth2SessionStore.consume("state-a"), null);
    oauth2SessionStore.save({
      state: "state-b",
      pluginId: "github",
      redirectUri: "https://fabric.example/b",
      ttlMs: 60_000,
    });

    setOAuth2SessionDatabaseProvider(() => profileA);
    assert.equal(oauth2SessionStore.consume("state-a")?.redirectUri, "https://fabric.example/a");

    setOAuth2SessionDatabaseProvider(() => profileB);
    assert.equal(oauth2SessionStore.consume("state-b")?.redirectUri, "https://fabric.example/b");

    profileA.close();
    profileB.close();
  });
});
