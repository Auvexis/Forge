import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OAuth2Tokens } from "@auvexis/sailor-sdk";

import { refreshOAuth2TokensIfNeeded } from "./executor.ts";
import type { OAuth2DeclarativeAuth, CustomOAuth2Auth } from "./auth/oauth2-types.ts";

const expiredTokens: OAuth2Tokens = {
  access_token: "old",
  refresh_token: "refresh",
  expires_at: 1,
};

function declarativeAuth(): OAuth2DeclarativeAuth {
  return {
    type: "oauth2",
    credentialSchema: {},
    authorization: {
      url: "https://provider.example/auth",
    },
    token: {
      url: "https://provider.example/token",
      clientAuth: { method: "none" },
      refreshParams: { grant_type: "refresh_token" },
      responseMapping: { accessToken: "access_token" },
    },
  };
}

describe("refreshOAuth2TokensIfNeeded", () => {
  it("refreshes expired declarative OAuth2 tokens through OAuth2Service", async () => {
    let saved: OAuth2Tokens | undefined;

    const result = await refreshOAuth2TokensIfNeeded({
      pluginId: "demo",
      auth: declarativeAuth(),
      tokens: expiredTokens,
      credentials: {},
      now: () => 10_000_000,
      saveTokens: (_pluginId, tokens) => {
        saved = tokens;
      },
      oauth2Service: {
        refreshTokens: async () => ({ access_token: "new" }),
      },
    });

    assert.deepEqual(result, { access_token: "new" });
    assert.deepEqual(saved, { access_token: "new" });
  });

  it("keeps legacy OAuth2 refreshTokens support", async () => {
    const auth: CustomOAuth2Auth = {
      type: "oauth2",
      credentialSchema: {},
      getAuthUrl: () => "https://provider.example/auth",
      exchangeCode: async () => ({ access_token: "access" }),
      refreshTokens: async () => ({ access_token: "legacy-new" }),
    };

    const result = await refreshOAuth2TokensIfNeeded({
      pluginId: "legacy",
      auth,
      tokens: expiredTokens,
      credentials: {},
      now: () => 10_000_000,
      saveTokens: () => {},
    });

    assert.deepEqual(result, { access_token: "legacy-new" });
  });

  it("throws actionable refresh errors", async () => {
    await assert.rejects(
      () =>
        refreshOAuth2TokensIfNeeded({
          pluginId: "demo",
          auth: declarativeAuth(),
          tokens: expiredTokens,
          credentials: {},
          now: () => 10_000_000,
          saveTokens: () => {},
          oauth2Service: {
            refreshTokens: async () => {
              throw new Error("invalid_grant");
            },
          },
        }),
      /Token refresh failed for plugin demo: invalid_grant/,
    );
  });
});
