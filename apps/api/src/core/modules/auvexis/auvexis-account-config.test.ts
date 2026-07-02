import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadAuvexisAccountConfig } from "./auvexis-account-config.ts";

describe("Auvexis account config", () => {
  it("loads defaults and required secrets", () => {
    const config = loadAuvexisAccountConfig({
      AUVEXIS_CLIENT_ID: "sailor",
      AUVEXIS_TOKEN_ENCRYPTION_SECRET: "x".repeat(32),
    });

    assert.equal(config.clientId, "sailor");
    assert.equal(config.baseUrl, "https://accounts.auvexis.com");
    assert.equal(
      config.redirectUri,
      "http://127.0.0.1:23801/auvexis/account/connect/callback",
    );
    assert.equal(config.tokenEncryptionSecret, "x".repeat(32));
  });

  it("rejects missing client id and token secret", () => {
    assert.throws(() => loadAuvexisAccountConfig({}), /AUVEXIS_CLIENT_ID/);
    assert.throws(
      () => loadAuvexisAccountConfig({ AUVEXIS_CLIENT_ID: "sailor" }),
      /AUVEXIS_TOKEN_ENCRYPTION_SECRET/,
    );
  });
});
