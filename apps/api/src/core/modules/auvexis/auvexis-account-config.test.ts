import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadAuvexisAccountConfig } from "./auvexis-account-config.ts";

describe("Auvexis account config", () => {
  it("loads production-safe defaults for distributed Fabric builds", () => {
    const config = loadAuvexisAccountConfig({}, "x".repeat(32));

    assert.equal(config.clientId, "fabric-desktop");
    assert.equal(config.baseUrl, "https://accounts.auvexis.com");
    assert.equal(
      config.redirectUri,
      "http://127.0.0.1:23801/auvexis/account/connect/callback",
    );
    assert.equal(config.tokenEncryptionSecret, "x".repeat(32));
  });

  it("allows development overrides from environment", () => {
    const config = loadAuvexisAccountConfig({
      AUVEXIS_CLIENT_ID: "fabric-dev",
      AUVEXIS_ACCOUNTS_URL: "http://127.0.0.1:8787",
      AUVEXIS_REDIRECT_URI: "http://127.0.0.1:23801/dev/callback",
      AUVEXIS_TOKEN_ENCRYPTION_SECRET: "y".repeat(32),
    });

    assert.equal(config.clientId, "fabric-dev");
    assert.equal(config.baseUrl, "http://127.0.0.1:8787");
    assert.equal(config.redirectUri, "http://127.0.0.1:23801/dev/callback");
    assert.equal(config.tokenEncryptionSecret, "y".repeat(32));
  });

  it("accepts a runtime default redirect URI from the public URL service", () => {
    const config = loadAuvexisAccountConfig(
      {},
      "z".repeat(32),
      "https://fabric.example/auvexis/account/connect/callback",
    );

    assert.equal(
      config.redirectUri,
      "https://fabric.example/auvexis/account/connect/callback",
    );
  });

  it("requires either env secret or local installation secret", () => {
    assert.throws(() => loadAuvexisAccountConfig({}), /local Auvexis token secret/);
  });
});
