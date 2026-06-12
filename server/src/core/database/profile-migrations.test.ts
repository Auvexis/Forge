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
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-migrations-"));
    const profileA = resolveProfilePaths({ sailorHome: home, profileId: "profile-a" });
    const profileB = resolveProfilePaths({ sailorHome: home, profileId: "profile-b" });
    const manager = new ProfileDatabaseManager();

    manager.open(profileA);
    await initializeProfileDatabases(manager);
    manager.app.prepare("INSERT INTO settings (key, value) VALUES ('profile', '\"a\"')").run();
    manager.workflows.prepare(`
      INSERT INTO workflows (id, name, version, created_at, definition)
      VALUES ('wf-a', 'A', '1.0.0', '2026-05-17T00:00:00.000Z', '{}')
    `).run();

    manager.open(profileB);
    await initializeProfileDatabases(manager);
    const profileBSettings = manager.app.prepare("SELECT * FROM settings").all();
    const profileBWorkflows = manager.workflows.prepare("SELECT * FROM workflows").all();
    manager.app.prepare("INSERT INTO settings (key, value) VALUES ('profile', '\"b\"')").run();

    manager.open(profileA);
    await initializeProfileDatabases(manager);
    const profileASetting = manager.app.prepare("SELECT value FROM settings WHERE key = 'profile'").get() as { value: string };
    const profileAWorkflow = manager.workflows.prepare("SELECT id FROM workflows WHERE id = 'wf-a'").get() as { id: string };
    manager.close();

    assert.deepEqual(profileBSettings, []);
    assert.deepEqual(profileBWorkflows, []);
    assert.equal(profileASetting.value, "\"a\"");
    assert.equal(profileAWorkflow.id, "wf-a");
  });
});
