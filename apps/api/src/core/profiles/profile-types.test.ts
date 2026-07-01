import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertUniqueProfileName,
  isValidProfileId,
  redactProfileManifest,
  validateProfileAvatarEmoji,
  validateProfileEmail,
  validateProfileId,
  type ProfileManifest,
  type ProfileSummary,
} from "./profile-types.ts";

describe("profile domain types", () => {
  it("accepts stable profile ids", () => {
    for (const id of ["default", "work", "client-a", "profile-2026"]) {
      assert.equal(isValidProfileId(id), true, id);
      assert.equal(validateProfileId(id), id);
    }
  });

  it("rejects malformed profile ids", () => {
    for (const id of ["", "A", "two words", "with_underscore", "-start", "end-", "a..b"]) {
      assert.equal(isValidProfileId(id), false, id);
      assert.throws(() => validateProfileId(id), /Invalid profile id/);
    }
  });

  it("rejects reserved and unsafe path profile ids", () => {
    for (const id of ["con", "nul", "prn", "aux", "com1", "lpt9", ".", "..", "../evil", "evil/path"]) {
      assert.equal(isValidProfileId(id), false, id);
      assert.throws(() => validateProfileId(id), /Invalid profile id/);
    }
  });

  it("detects duplicate display names case-insensitively", () => {
    const profiles: ProfileSummary[] = [
      { id: "default", name: "Default", avatarEmoji: "⛵", email: null, passwordProtected: false },
      { id: "work", name: "Work", avatarEmoji: "💼", email: null, passwordProtected: true },
    ];

    assert.throws(() => assertUniqueProfileName(" work ", profiles), /already exists/);
    assert.doesNotThrow(() => assertUniqueProfileName("Work", profiles, "work"));
    assert.doesNotThrow(() => assertUniqueProfileName("Personal", profiles));
  });

  it("validates emoji avatars as short grapheme values", () => {
    assert.equal(validateProfileAvatarEmoji("⛵"), "⛵");
    assert.equal(validateProfileAvatarEmoji("👩‍💻"), "👩‍💻");

    for (const avatar of ["", "S", "avatar", "https://example.com/a.png", "<svg></svg>", "AB"]) {
      assert.throws(() => validateProfileAvatarEmoji(avatar), /Invalid profile avatar/);
    }
  });

  it("validates optional email without requiring an account", () => {
    assert.equal(validateProfileEmail(undefined), null);
    assert.equal(validateProfileEmail(null), null);
    assert.equal(validateProfileEmail(" user@example.com "), "user@example.com");

    for (const email of ["missing-at", "a@", "@example.com", "a b@example.com"]) {
      assert.throws(() => validateProfileEmail(email), /Invalid profile email/);
    }
  });

  it("redacts password metadata from public profile summaries", () => {
    const manifest: ProfileManifest = {
      id: "work",
      name: "Work",
      avatarEmoji: "💼",
      email: "work@example.com",
      password: {
        enabled: true,
        hash: "secret-hash",
        algorithm: "scrypt",
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
      createdAt: "2026-05-17T00:00:00.000Z",
      updatedAt: "2026-05-17T00:00:00.000Z",
    };

    assert.deepEqual(redactProfileManifest(manifest), {
      id: "work",
      name: "Work",
      avatarEmoji: "💼",
      email: "work@example.com",
      passwordProtected: true,
    });
  });
});
