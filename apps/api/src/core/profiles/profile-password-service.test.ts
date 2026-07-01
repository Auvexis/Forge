import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { ProfilePasswordService } from "./profile-password-service.ts";
import { ProfileStore } from "./profile-store.ts";

function createStore(): ProfileStore {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-profile-password-"));
  const store = new ProfileStore({ sailorHome: home });
  store.ensureInitialized();
  store.createProfile({ id: "work", name: "Work", avatarEmoji: "💼" });
  return store;
}

describe("ProfilePasswordService", () => {
  it("sets and verifies a profile password using a salted hash", () => {
    const store = createStore();
    const service = new ProfilePasswordService({ store });

    service.setPassword("work", "correct horse battery staple");

    const manifest = store.getProfileManifest("work");
    assert.equal(manifest?.password.enabled, true);
    assert.equal(manifest?.password.algorithm, "scrypt");
    assert.notEqual(manifest?.password.hash, "correct horse battery staple");
    assert.match(manifest?.password.hash ?? "", /^scrypt\$/);
    assert.equal(service.verifyPassword({ profileId: "work", password: "correct horse battery staple" }), true);
  });

  it("rejects wrong passwords without throwing", () => {
    const store = createStore();
    const service = new ProfilePasswordService({ store });
    service.setPassword("work", "secret");

    assert.equal(service.verifyPassword({ profileId: "work", password: "wrong" }), false);
  });

  it("uses a new salt every time a password is changed", () => {
    const store = createStore();
    const service = new ProfilePasswordService({ store });

    service.setPassword("work", "secret");
    const firstHash = store.getProfileManifest("work")?.password.hash;
    service.setPassword("work", "secret");
    const secondHash = store.getProfileManifest("work")?.password.hash;

    assert.notEqual(firstHash, secondHash);
  });

  it("removes password protection", () => {
    const store = createStore();
    const service = new ProfilePasswordService({ store });
    service.setPassword("work", "secret");

    service.removePassword("work");

    const manifest = store.getProfileManifest("work");
    assert.equal(manifest?.password.enabled, false);
    assert.equal(manifest?.password.hash, null);
    assert.equal(service.verifyPassword({ profileId: "work", password: "secret" }), false);
  });

  it("keeps password hashes out of public profile responses", () => {
    const store = createStore();
    const service = new ProfilePasswordService({ store });
    service.setPassword("work", "secret");

    const publicProfile = store.getProfile("work");
    assert.equal(publicProfile?.passwordProtected, true);
    assert.equal(JSON.stringify(publicProfile).includes("scrypt$"), false);
  });
});
