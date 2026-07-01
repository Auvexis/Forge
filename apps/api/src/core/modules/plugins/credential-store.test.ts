import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import {
  CredentialStore,
  resetCredentialsDatabaseProvider,
  setCredentialsDatabaseProvider,
} from "./credential-store.ts";

async function createCredentialsDb(): Promise<Database.Database> {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  await createMigrationEngine(db, "credentials").up();
  return db;
}

describe("CredentialStore", () => {
  afterEach(() => {
    resetCredentialsDatabaseProvider();
  });

  it("uses the active database provider so credentials and tokens stay isolated by profile", async () => {
    const profileA = await createCredentialsDb();
    const profileB = await createCredentialsDb();

    setCredentialsDatabaseProvider(() => profileA);
    CredentialStore.saveCredentials("github", { clientId: "profile-a" });
    CredentialStore.saveTokens("github", { access_token: "token-a" });

    setCredentialsDatabaseProvider(() => profileB);
    assert.equal(CredentialStore.getCredentials("github"), null);
    assert.equal(CredentialStore.getTokens("github"), null);
    CredentialStore.saveCredentials("github", { clientId: "profile-b" });

    setCredentialsDatabaseProvider(() => profileA);
    assert.deepEqual(CredentialStore.getCredentials("github"), { clientId: "profile-a" });
    assert.deepEqual(CredentialStore.getTokens("github"), { access_token: "token-a" });

    setCredentialsDatabaseProvider(() => profileB);
    assert.deepEqual(CredentialStore.getCredentials("github"), { clientId: "profile-b" });

    profileA.close();
    profileB.close();
  });
});
