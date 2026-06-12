import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { getProfileDatabaseContext } from "./profile-database-context.ts";
import { ProfileScopeRunner } from "./profile-scope-runner.ts";
import { ProfileStore } from "./profile-store.ts";

describe("ProfileScopeRunner", () => {
  it("runs callbacks inside the requested profile database context", () => {
    const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-scope-"));
    const store = new ProfileStore({ sailorHome });
    store.ensureInitialized();
    store.createProfile({ id: "andre", name: "Andre", avatarEmoji: "🧭" });
    const runner = new ProfileScopeRunner({ sailorHome, store });

    const dbPath = runner.runWithProfile("andre", () => {
      const context = getProfileDatabaseContext();
      assert.ok(context);
      context.app.prepare("CREATE TABLE marker (profile_id TEXT)").run();
      context.app.prepare("INSERT INTO marker (profile_id) VALUES ('andre')").run();
      return context.app.name;
    });

    assert.match(dbPath, /andre[\\\/]data[\\\/]app\.db$/);
    assert.equal(getProfileDatabaseContext(), null);
  });

  it("closes temporary profile handles after async callbacks fail", async () => {
    const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-scope-"));
    const store = new ProfileStore({ sailorHome });
    store.ensureInitialized();
    const runner = new ProfileScopeRunner({ sailorHome, store });
    let openDuringCallback = false;

    await assert.rejects(
      () => runner.runWithProfile("default", async () => {
        const context = getProfileDatabaseContext();
        assert.ok(context);
        openDuringCallback = context.app.open;
        throw new Error("boom");
      }),
      /boom/,
    );

    assert.equal(openDuringCallback, true);
    assert.equal(getProfileDatabaseContext(), null);
  });

  it("rejects unknown profile ids before opening databases", () => {
    const sailorHome = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-scope-"));
    const store = new ProfileStore({ sailorHome });
    store.ensureInitialized();
    const runner = new ProfileScopeRunner({ sailorHome, store });

    assert.throws(
      () => runner.runWithProfile("missing", () => "never"),
      /Profile 'missing' not found/,
    );
  });
});
