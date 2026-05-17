import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { ActiveProfileService } from "./active-profile-service.ts";
import { ProfilePasswordService } from "./profile-password-service.ts";
import { ProfileStore } from "./profile-store.ts";
import type { ProfilePaths } from "./profile-paths.ts";
import { AppRepository, resetAppDatabaseProvider } from "../modules/app/app-repository.ts";
import { resetWorkflowDatabaseProvider } from "../modules/workflows/repository.ts";
import { resetCredentialsDatabaseProvider } from "../modules/plugins/credential-store.ts";
import { resetOAuth2SessionDatabaseProvider } from "../modules/plugins/auth/oauth2-session-store.ts";

class FakeDatabaseManager {
  opened: string[] = [];
  app = "app-db";
  workflows = "workflows-db";
  credentials = "credentials-db";
  open(paths: ProfilePaths): void {
    this.opened.push(path.basename(paths.profileDir));
  }
  close(): void {
    this.opened.push("closed");
  }
  get active(): string | null {
    const last = [...this.opened].reverse().find((entry) => entry !== "closed");
    return last ?? null;
  }
}

function createStore(): ProfileStore {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-active-profile-"));
  const store = new ProfileStore({ sailorHome: home });
  store.ensureInitialized();
  store.createProfile({ id: "work", name: "Work", avatarEmoji: "💼" });
  return store;
}

describe("ActiveProfileService", () => {
  afterEach(() => {
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
    resetCredentialsDatabaseProvider();
    resetOAuth2SessionDatabaseProvider();
  });

  it("starts the current profile and runs runtime hooks", async () => {
    const store = createStore();
    const db = new FakeDatabaseManager();
    const calls: string[] = [];
    const service = new ActiveProfileService({
      sailorHome: fs.mkdtempSync(path.join(os.tmpdir(), "sailor-active-home-")),
      store,
      passwordService: new ProfilePasswordService({ store }),
      databaseManager: db,
      migrate: async () => {
        calls.push("migrate");
      },
      loadProfilePluginSettings: async () => {
        calls.push("loadProfilePluginSettings");
      },
      loadPlugins: async () => {
        calls.push("loadPlugins");
      },
      scheduler: { resync: () => calls.push("resync") },
    });

    await service.start();

    assert.equal(service.getActiveProfile()?.id, "default");
    assert.deepEqual(db.opened, ["default"]);
    assert.deepEqual(calls, ["migrate", "loadProfilePluginSettings", "loadPlugins", "resync"]);
  });

  it("loads profile plugin settings with resolved active profile paths before plugins", async () => {
    const store = createStore();
    const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-active-home-"));
    const calls: string[] = [];
    let settingsProfileDir: string | null = null;
    const service = new ActiveProfileService({
      sailorHome,
      store,
      passwordService: new ProfilePasswordService({ store }),
      databaseManager: new FakeDatabaseManager(),
      migrate: async () => {
        calls.push("migrate");
      },
      loadProfilePluginSettings: async (_profile, paths) => {
        calls.push("loadProfilePluginSettings");
        settingsProfileDir = paths.profileDir;
      },
      loadPlugins: async () => {
        calls.push("loadPlugins");
      },
      scheduler: { resync: () => calls.push("resync") },
    });

    await service.start();

    assert.equal(settingsProfileDir, path.join(sailorHome, "profiles", "default"));
    assert.deepEqual(calls, ["migrate", "loadProfilePluginSettings", "loadPlugins", "resync"]);
  });

  it("configures profile-scoped repository providers after opening databases", async () => {
    const store = createStore();
    const db = new FakeDatabaseManager();
    const configured: string[] = [];
    const service = new ActiveProfileService({
      sailorHome: fs.mkdtempSync(path.join(os.tmpdir(), "sailor-active-home-")),
      store,
      passwordService: new ProfilePasswordService({ store }),
      databaseManager: db,
      configureProfileRepositories: (manager) => {
        configured.push(String(manager.app), String(manager.workflows), String(manager.credentials));
      },
      migrate: async () => {},
      loadProfilePluginSettings: async () => {},
      loadPlugins: async () => {},
      scheduler: { resync: () => {} },
    });

    await service.start();

    assert.deepEqual(configured, ["app-db", "workflows-db", "credentials-db"]);
  });

  it("uses default repository provider wiring for active profile app settings", async () => {
    const store = createStore();
    const appDb = new Database(":memory:");
    appDb.prepare("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)").run();
    const workflowDb = new Database(":memory:");
    const credentialsDb = new Database(":memory:");
    const db = {
      app: appDb,
      workflows: workflowDb,
      credentials: credentialsDb,
      open: () => {},
      close: () => {},
    };
    const service = new ActiveProfileService({
      sailorHome: fs.mkdtempSync(path.join(os.tmpdir(), "sailor-active-home-")),
      store,
      passwordService: new ProfilePasswordService({ store }),
      databaseManager: db,
      migrate: async () => {},
      loadProfilePluginSettings: async () => {},
      loadPlugins: async () => {},
      scheduler: { resync: () => {} },
    });

    await service.start();
    AppRepository.setSetting("public_url", "https://profile.example");

    const row = appDb.prepare("SELECT value FROM settings WHERE key = 'public_url'").get() as { value: string };
    assert.equal(JSON.parse(row.value), "https://profile.example");
    appDb.close();
    workflowDb.close();
    credentialsDb.close();
  });

  it("switches to an unprotected profile after opening runtime dependencies", async () => {
    const store = createStore();
    const db = new FakeDatabaseManager();
    const service = new ActiveProfileService({
      sailorHome: fs.mkdtempSync(path.join(os.tmpdir(), "sailor-active-home-")),
      store,
      passwordService: new ProfilePasswordService({ store }),
      databaseManager: db,
      migrate: async () => {},
      loadProfilePluginSettings: async () => {},
      loadPlugins: async () => {},
      scheduler: { resync: () => {} },
    });
    await service.start();

    const switched = await service.switchProfile({ profileId: "work" });

    assert.equal(switched.id, "work");
    assert.equal(store.getCurrentProfile()?.id, "work");
    assert.deepEqual(db.opened, ["default", "work"]);
  });

  it("requires a valid password before switching to a protected profile", async () => {
    const store = createStore();
    const passwordService = new ProfilePasswordService({ store });
    passwordService.setPassword("work", "secret");
    const db = new FakeDatabaseManager();
    const service = new ActiveProfileService({
      sailorHome: fs.mkdtempSync(path.join(os.tmpdir(), "sailor-active-home-")),
      store,
      passwordService,
      databaseManager: db,
      migrate: async () => {},
      loadProfilePluginSettings: async () => {},
      loadPlugins: async () => {},
      scheduler: { resync: () => {} },
    });
    await service.start();

    await assert.rejects(
      () => service.switchProfile({ profileId: "work" }),
      /PROFILE_PASSWORD_REQUIRED/,
    );
    await assert.rejects(
      () => service.switchProfile({ profileId: "work", password: "wrong" }),
      /PROFILE_PASSWORD_INVALID/,
    );

    const switched = await service.switchProfile({ profileId: "work", password: "secret" });
    assert.equal(switched.id, "work");
  });

  it("keeps the previous active profile usable when switch hooks fail", async () => {
    const store = createStore();
    const db = new FakeDatabaseManager();
    const service = new ActiveProfileService({
      sailorHome: fs.mkdtempSync(path.join(os.tmpdir(), "sailor-active-home-")),
      store,
      passwordService: new ProfilePasswordService({ store }),
      databaseManager: db,
      migrate: async () => {},
      loadProfilePluginSettings: async () => {},
      loadPlugins: async (profile) => {
        if (profile.id === "work") throw new Error("plugin load failed");
      },
      scheduler: { resync: () => {} },
    });
    await service.start();

    await assert.rejects(
      () => service.switchProfile({ profileId: "work" }),
      /plugin load failed/,
    );

    assert.equal(service.getActiveProfile()?.id, "default");
    assert.equal(store.getCurrentProfile()?.id, "default");
    assert.equal(db.active, "default");
  });
});
