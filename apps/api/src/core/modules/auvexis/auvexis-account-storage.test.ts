import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { createAuvexisAccountStorage } from "./auvexis-account-storage.ts";

describe("Auvexis account storage", () => {
  it("encrypts tokens and round trips a connected account", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-auvexis-"));
    const storage = createAuvexisAccountStorage({
      dataDir,
      tokenEncryptionSecret: "x".repeat(32),
      clock: () => new Date("2026-07-01T12:00:00.000Z"),
    });

    storage.saveConnected({
      account: {
        id: "account-1",
        username: "andre",
        badges: [],
      },
      tokens: {
        accessToken: "access-secret",
        refreshToken: "refresh-secret",
        tokenType: "Bearer",
        scope: ["openid", "profile"],
      },
    });

    const raw = fs.readFileSync(
      path.join(dataDir, "auvexis-account.json"),
      "utf8",
    );
    assert.equal(raw.includes("access-secret"), false);
    assert.equal(raw.includes("refresh-secret"), false);

    assert.deepEqual(storage.read(), {
      version: 1,
      status: "connected",
      account: {
        id: "account-1",
        username: "andre",
        badges: [],
      },
      tokens: {
        accessToken: "access-secret",
        refreshToken: "refresh-secret",
        tokenType: "Bearer",
        scope: ["openid", "profile"],
      },
      connectedAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-01T12:00:00.000Z",
      lastValidatedAt: null,
    });
  });

  it("marks reconnect and clears local state", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-auvexis-"));
    const storage = createAuvexisAccountStorage({
      dataDir,
      tokenEncryptionSecret: "x".repeat(32),
      clock: () => new Date("2026-07-01T12:00:00.000Z"),
    });

    storage.markNeedsReconnect();
    assert.equal(storage.read().status, "needs_reconnect");

    storage.clearLocal();
    assert.equal(storage.read().status, "disconnected");
    assert.equal(storage.read().tokens, null);
  });
});
