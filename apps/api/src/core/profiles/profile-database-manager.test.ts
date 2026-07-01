import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { ProfileDatabaseManager } from "./profile-database-manager.ts";
import { resolveProfilePaths } from "./profile-paths.ts";

describe("ProfileDatabaseManager", () => {
  it("opens all databases inside the active profile data directory", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-db-"));
    const paths = resolveProfilePaths({ sailorHome: home, profileId: "profile-a" });
    const manager = new ProfileDatabaseManager();

    manager.open(paths);
    manager.app.prepare("CREATE TABLE marker (id TEXT PRIMARY KEY)").run();
    manager.workflows.prepare("CREATE TABLE workflows_marker (id TEXT PRIMARY KEY)").run();
    manager.plugins.prepare("CREATE TABLE plugins_marker (id TEXT PRIMARY KEY)").run();
    manager.credentials.prepare("CREATE TABLE credentials_marker (id TEXT PRIMARY KEY)").run();
    manager.notifications.prepare("CREATE TABLE notifications_marker (id TEXT PRIMARY KEY)").run();
    manager.close();

    for (const dbPath of [
      paths.appDbPath,
      paths.workflowsDbPath,
      paths.pluginsDbPath,
      paths.credentialsDbPath,
      paths.notificationsDbPath,
    ]) {
      assert.equal(fs.existsSync(dbPath), true, `${dbPath} should exist`);
    }
  });

  it("keeps notification database files isolated by profile", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-db-"));
    const profileA = resolveProfilePaths({ sailorHome: home, profileId: "profile-a" });
    const profileB = resolveProfilePaths({ sailorHome: home, profileId: "profile-b" });
    const manager = new ProfileDatabaseManager();

    manager.open(profileA);
    manager.notifications.prepare("CREATE TABLE marker (value TEXT NOT NULL)").run();
    manager.notifications.prepare("INSERT INTO marker (value) VALUES ('a')").run();

    manager.open(profileB);
    manager.notifications.prepare("CREATE TABLE marker (value TEXT NOT NULL)").run();
    manager.notifications.prepare("INSERT INTO marker (value) VALUES ('b')").run();
    const b = manager.notifications.prepare("SELECT value FROM marker").get() as { value: string };

    manager.open(profileA);
    const a = manager.notifications.prepare("SELECT value FROM marker").get() as { value: string };
    manager.close();

    assert.equal(a.value, "a");
    assert.equal(b.value, "b");
  });

  it("keeps profile database files isolated", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-db-"));
    const profileA = resolveProfilePaths({ sailorHome: home, profileId: "profile-a" });
    const profileB = resolveProfilePaths({ sailorHome: home, profileId: "profile-b" });
    const manager = new ProfileDatabaseManager();

    manager.open(profileA);
    manager.app.prepare("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)").run();
    manager.app.prepare("INSERT INTO settings (key, value) VALUES ('profile', 'a')").run();

    manager.open(profileB);
    manager.app.prepare("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)").run();
    manager.app.prepare("INSERT INTO settings (key, value) VALUES ('profile', 'b')").run();
    const b = manager.app.prepare("SELECT value FROM settings WHERE key = 'profile'").get() as { value: string };

    manager.open(profileA);
    const a = manager.app.prepare("SELECT value FROM settings WHERE key = 'profile'").get() as { value: string };
    manager.close();

    assert.equal(a.value, "a");
    assert.equal(b.value, "b");
  });

  it("closes old handles before opening another profile", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-db-"));
    const profileA = resolveProfilePaths({ sailorHome: home, profileId: "profile-a" });
    const profileB = resolveProfilePaths({ sailorHome: home, profileId: "profile-b" });
    const manager = new ProfileDatabaseManager();

    manager.open(profileA);
    const oldApp = manager.app;
    const oldNotifications = manager.notifications;
    assert.equal(oldApp.open, true);

    manager.open(profileB);

    assert.equal(oldApp.open, false);
    assert.equal(oldNotifications.open, false);
    assert.equal(manager.app.open, true);
    assert.equal(manager.notifications.open, true);
    manager.close();
  });

  it("throws when databases are read before a profile is open", () => {
    const manager = new ProfileDatabaseManager();

    assert.throws(() => manager.app, /No active profile database/);
    assert.throws(() => manager.notifications, /No active profile database/);
  });
});
