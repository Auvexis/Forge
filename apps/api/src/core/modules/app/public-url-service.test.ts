import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import {
  AppRepository,
  resetAppDatabaseProvider,
  setAppDatabaseProvider,
} from "./app-repository.ts";
import { PublicUrlService } from "./public-url-service.ts";

async function createAppDb(): Promise<Database.Database> {
  const db = new Database(":memory:");
  await createMigrationEngine(db, "app").up();
  return db;
}

describe("PublicUrlService", () => {
  afterEach(() => {
    delete process.env.FABRIC_PUBLIC_URL;
    delete process.env.PUBLIC_URL;
    delete process.env.FABRIC_PUBLIC_URL_LOCKED;
    resetAppDatabaseProvider();
  });

  it("prefers configured settings over env and normalizes trailing slashes", async () => {
    const db = await createAppDb();
    setAppDatabaseProvider(() => db);
    process.env.FABRIC_PUBLIC_URL = "https://env.example";
    AppRepository.setSetting("public_url", "https://fabric.example/");

    const config = PublicUrlService.getConfig();

    assert.equal(config.publicUrl, "https://fabric.example");
    assert.equal(config.source, "setting");

    db.close();
  });

  it("saves app changes as pending until startup promotion", async () => {
    const db = await createAppDb();
    setAppDatabaseProvider(() => db);
    AppRepository.setSetting("public_url", "https://old.example");

    const result = PublicUrlService.savePending("https://new.example");

    assert.equal(result.publicUrl, "https://old.example");
    assert.equal(result.pendingPublicUrl, "https://new.example");
    assert.equal(PublicUrlService.getPublicUrl(), "https://old.example");

    PublicUrlService.applyPendingOnStartup();

    assert.equal(PublicUrlService.getPublicUrl(), "https://new.example");
    assert.equal(AppRepository.getSetting("public_url_pending"), null);

    db.close();
  });

  it("clears configured and pending public URLs back to the default URL", async () => {
    const db = await createAppDb();
    setAppDatabaseProvider(() => db);
    AppRepository.setSetting("public_url", "https://old.example");
    AppRepository.setSetting("public_url_pending", "https://pending.example");

    const result = PublicUrlService.clearPending();

    assert.equal(result.publicUrl, "http://localhost:23801");
    assert.equal(result.pendingPublicUrl, null);
    assert.equal(result.restartRequired, true);
    assert.equal(AppRepository.getSetting("public_url"), null);
    assert.equal(AppRepository.getSetting("public_url_pending"), null);

    db.close();
  });

  it("rejects unsafe external http URLs", async () => {
    const db = await createAppDb();
    setAppDatabaseProvider(() => db);

    assert.throws(
      () => PublicUrlService.savePending("http://fabric.example"),
      /must use HTTPS/,
    );

    db.close();
  });

  it("honors locked env configuration", async () => {
    const db = await createAppDb();
    setAppDatabaseProvider(() => db);
    process.env.FABRIC_PUBLIC_URL = "https://locked.example";
    process.env.FABRIC_PUBLIC_URL_LOCKED = "true";
    AppRepository.setSetting("public_url", "https://db.example");
    AppRepository.setSetting("public_url_pending", "https://pending.example");

    PublicUrlService.applyPendingOnStartup();

    assert.equal(PublicUrlService.getPublicUrl(), "https://locked.example");
    assert.equal(AppRepository.getSetting("public_url_pending"), null);
    assert.throws(
      () => PublicUrlService.savePending("https://new.example"),
      /locked/,
    );

    db.close();
  });
});
