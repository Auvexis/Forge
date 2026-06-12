import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import {
  AppRepository,
  resetAppDatabaseProvider,
  setAppDatabaseProvider,
} from "./app-repository.ts";

async function createAppDb(): Promise<Database.Database> {
  const db = new Database(":memory:");
  await createMigrationEngine(db, "app").up();
  return db;
}

describe("AppRepository", () => {
  afterEach(() => {
    resetAppDatabaseProvider();
  });

  it("uses the active database provider so settings and global variables stay isolated by profile", async () => {
    const profileA = await createAppDb();
    const profileB = await createAppDb();

    setAppDatabaseProvider(() => profileA);
    AppRepository.setSetting("public_url", "https://a.example");
    AppRepository.setGlobalVariable("API_BASE_URL", "https://api-a.example", "Profile A API");

    setAppDatabaseProvider(() => profileB);
    assert.equal(AppRepository.getSetting("public_url"), null);
    assert.deepEqual(AppRepository.getAllGlobalVariablesAsMap(), {});
    AppRepository.setSetting("public_url", "https://b.example");
    AppRepository.setGlobalVariable("API_BASE_URL", "https://api-b.example", "Profile B API");

    setAppDatabaseProvider(() => profileA);
    assert.equal(AppRepository.getSetting("public_url"), "https://a.example");
    assert.deepEqual(AppRepository.getAllGlobalVariablesAsMap(), {
      API_BASE_URL: "https://api-a.example",
    });

    setAppDatabaseProvider(() => profileB);
    assert.equal(AppRepository.getSetting("public_url"), "https://b.example");
    assert.deepEqual(AppRepository.getAllGlobalVariablesAsMap(), {
      API_BASE_URL: "https://api-b.example",
    });

    profileA.close();
    profileB.close();
  });
});
