import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { initializeProfileDatabases } from "./index.ts";
import { ProfileDatabaseManager } from "../profiles/profile-database-manager.ts";
import { resolveProfilePaths } from "../profiles/profile-paths.ts";

describe("profile database migrations", () => {
  it("runs migrations independently for each active profile", async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-profile-migrations-"));
    const profileA = resolveProfilePaths({ fabricHome: home, profileId: "profile-a" });
    const profileB = resolveProfilePaths({ fabricHome: home, profileId: "profile-b" });
    const manager = new ProfileDatabaseManager();

    manager.open(profileA);
    await initializeProfileDatabases(manager);
    manager.app.prepare("INSERT INTO settings (key, value) VALUES ('profile', '\"a\"')").run();
    manager.workflows.prepare(`
      INSERT INTO workflows (id, name, version, created_at, definition)
      VALUES ('wf-a', 'A', '1.0.0', '2026-05-17T00:00:00.000Z', '{}')
    `).run();
    manager.notifications.prepare(`
      INSERT INTO notifications (
        id, level, category, message, occurrence_count, is_read, created_at, last_occurred_at
      ) VALUES (
        'notification-a', 'error', 'global', 'Profile A error', 1, 0,
        '2026-06-28T00:00:00.000Z', '2026-06-28T00:00:00.000Z'
      )
    `).run();

    manager.open(profileB);
    await initializeProfileDatabases(manager);
    const profileBSettings = manager.app.prepare("SELECT * FROM settings").all();
    const profileBWorkflows = manager.workflows.prepare("SELECT * FROM workflows").all();
    const profileBNotifications = manager.notifications.prepare("SELECT * FROM notifications").all();
    manager.app.prepare("INSERT INTO settings (key, value) VALUES ('profile', '\"b\"')").run();

    manager.open(profileA);
    await initializeProfileDatabases(manager);
    const profileASetting = manager.app.prepare("SELECT value FROM settings WHERE key = 'profile'").get() as { value: string };
    const profileAWorkflow = manager.workflows.prepare("SELECT id FROM workflows WHERE id = 'wf-a'").get() as { id: string };
    const profileANotification = manager.notifications.prepare("SELECT id FROM notifications WHERE id = 'notification-a'").get() as { id: string };
    manager.close();

    assert.deepEqual(profileBSettings, []);
    assert.deepEqual(profileBWorkflows, []);
    assert.deepEqual(profileBNotifications, []);
    assert.equal(profileASetting.value, "\"a\"");
    assert.equal(profileAWorkflow.id, "wf-a");
    assert.equal(profileANotification.id, "notification-a");
  });

  it("creates notification constraints and lookup indexes", async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-profile-migrations-"));
    const paths = resolveProfilePaths({ fabricHome: home, profileId: "profile-a" });
    const manager = new ProfileDatabaseManager();

    manager.open(paths);
    await initializeProfileDatabases(manager);

    const indexes = manager.notifications
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'notifications'")
      .all() as Array<{ name: string }>;

    assert.deepEqual(
      indexes.map(({ name }) => name).sort(),
      [
        "idx_notifications_category_last_occurred",
        "idx_notifications_level_last_occurred",
        "idx_notifications_unread_last_occurred",
        "sqlite_autoindex_notifications_1",
      ],
    );
    assert.throws(
      () => manager.notifications.prepare(`
        INSERT INTO notifications (
          id, level, category, message, occurrence_count, is_read, created_at, last_occurred_at
        ) VALUES ('invalid', 'success', 'global', 'Nope', 1, 0, 'now', 'now')
      `).run(),
      /CHECK constraint failed/,
    );
    manager.close();
  });
});
