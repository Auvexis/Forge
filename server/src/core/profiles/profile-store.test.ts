import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { ProfileStore } from "./profile-store.ts";

function createHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-store-"));
}

describe("ProfileStore", () => {
  it("bootstraps the default profile on first run", () => {
    const home = createHome();
    const store = new ProfileStore({ sailorHome: home });

    store.ensureInitialized();

    assert.deepEqual(store.getCurrentProfile()?.id, "default");
    assert.deepEqual(store.listProfiles(), [
      {
        id: "default",
        name: "Default",
        avatarEmoji: "⛵",
        email: null,
        passwordProtected: false,
      },
    ]);
    assert.equal(fs.existsSync(path.join(home, "profiles.json")), true);
    assert.equal(fs.existsSync(path.join(home, "profiles", "default", "profile.json")), true);
  });

  it("persists created profiles and current profile selection", () => {
    const home = createHome();
    const store = new ProfileStore({ sailorHome: home });
    store.ensureInitialized();

    const created = store.createProfile({
      id: "work",
      name: "Work",
      avatarEmoji: "💼",
      email: " work@example.com ",
    });
    store.setCurrentProfile("work");

    const reloaded = new ProfileStore({ sailorHome: home });
    assert.equal(created.id, "work");
    assert.equal(reloaded.getCurrentProfile()?.id, "work");
    assert.deepEqual(reloaded.getProfile("work"), {
      id: "work",
      name: "Work",
      avatarEmoji: "💼",
      email: "work@example.com",
      passwordProtected: false,
    });
  });

  it("rejects duplicate ids and duplicate display names", () => {
    const store = new ProfileStore({ sailorHome: createHome() });
    store.ensureInitialized();
    store.createProfile({ id: "work", name: "Work", avatarEmoji: "💼" });

    assert.throws(
      () => store.createProfile({ id: "work", name: "Other", avatarEmoji: "🧭" }),
      /already exists/,
    );
    assert.throws(
      () => store.createProfile({ id: "other", name: " work ", avatarEmoji: "🧭" }),
      /already exists/,
    );
  });

  it("updates metadata and password metadata without exposing hashes", () => {
    const store = new ProfileStore({ sailorHome: createHome() });
    store.ensureInitialized();
    store.createProfile({ id: "work", name: "Work", avatarEmoji: "💼" });

    const updated = store.updateProfile("work", {
      name: "Client Work",
      avatarEmoji: "🧭",
      email: "client@example.com",
    });
    store.setPasswordMetadata("work", {
      enabled: true,
      hash: "hash-value",
      algorithm: "scrypt",
      createdAt: "2026-05-17T00:00:00.000Z",
      updatedAt: "2026-05-17T00:00:00.000Z",
    });

    assert.equal(updated.name, "Client Work");
    assert.deepEqual(store.getProfile("work"), {
      id: "work",
      name: "Client Work",
      avatarEmoji: "🧭",
      email: "client@example.com",
      passwordProtected: true,
    });
    assert.equal(JSON.stringify(store.getProfile("work")).includes("hash-value"), false);

    store.clearPasswordMetadata("work");
    assert.equal(store.getProfile("work")?.passwordProtected, false);
  });

  it("guards switching and deleting profiles", () => {
    const store = new ProfileStore({ sailorHome: createHome() });
    store.ensureInitialized();
    store.createProfile({ id: "work", name: "Work", avatarEmoji: "💼" });

    assert.throws(() => store.setCurrentProfile("missing"), /not found/);
    assert.throws(() => store.deleteProfile("default"), /active profile/);

    store.setCurrentProfile("work");
    store.deleteProfile("default");

    assert.equal(store.getProfile("default"), null);
    assert.throws(() => store.deleteProfile("work"), /active profile/);
  });
});
