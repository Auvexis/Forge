import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAuvexisAccountLinkService } from "./auvexis-account-link-service.ts";
import type {
  AuthorizationTransaction,
  AuvexisProductSubject,
} from "@auvexis/accounts";

const fakeTransaction: AuthorizationTransaction = {
  authorizationUrl: new URL(
    "https://accounts.auvexis.com/api/auth/oauth2/authorize?state=state-1",
  ),
  state: "state-1",
  nonce: "nonce-1",
  codeVerifier: "verifier-1",
  createdAt: 1_782_950_400_000,
};

const fakeCreateAuthorization = async (
  input: { productSubject?: AuvexisProductSubject } = {},
) => {
  void input;
  return fakeTransaction;
};

describe("Auvexis account link service", () => {
  it("creates an OAuth authorization for the active Sailor profile", async () => {
    const calls: unknown[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: async (
          input: { productSubject?: AuvexisProductSubject } = {},
        ) => {
          calls.push(input);
          return fakeTransaction;
        },
      },
    });

    const result = await service.createAuthorization({
      profileId: "default",
    });

    assert.equal(
      result.authorizationUrl,
      "https://accounts.auvexis.com/api/auth/oauth2/authorize?state=state-1",
    );
    assert.equal(result.state, "state-1");
    assert.equal(result.createdAt, 1_782_950_400_000);
    assert.deepEqual(calls, [
      {
        productSubject: {
          type: "local_profile",
          id: "default",
        },
      },
    ]);
  });

  it("stores transaction state when starting OAuth", async () => {
    const saved: unknown[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
      },
      transactions: {
        save: async (profileId, transaction) => {
          saved.push({ profileId, transaction });
        },
        consume: async () => null,
      },
      storage: {
        saveConnected: () => undefined,
      },
    });

    await service.createAuthorization({ profileId: "default" });

    assert.equal((saved[0] as { profileId: string }).profileId, "default");
    assert.equal(
      (saved[0] as { transaction: { state: string } }).transaction.state,
      "state-1",
    );
  });

  it("exchanges callback, fetches profile, saves connection, and consumes transaction", async () => {
    const saved: unknown[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        exchangeCode: async ({ callbackUrl, transaction }) => {
          assert.equal(
            callbackUrl,
            "http://127.0.0.1:23801/auvexis/account/connect/callback?code=abc&state=state-1",
          );
          assert.equal(transaction.state, "state-1");
          return {
            accessToken: "access",
            refreshToken: "refresh",
            tokenType: "Bearer",
            scope: ["openid", "profile"],
          };
        },
        getProfile: async (accessToken) => {
          assert.equal(accessToken, "access");
          return {
            id: "account-1",
            username: "andre",
            joinedAt: "2026-07-01T00:00:00.000Z",
            linkedProviders: ["github"],
            badges: [],
          };
        },
      },
      transactions: {
        save: async () => undefined,
        consume: async (profileId, state) => {
          assert.equal(profileId, "default");
          assert.equal(state, "state-1");
          return fakeTransaction;
        },
      },
      storage: {
        saveConnected: (input) => saved.push(input),
      },
    });

    const result = await service.completeCallback({
      profileId: "default",
      callbackUrl:
        "http://127.0.0.1:23801/auvexis/account/connect/callback?code=abc&state=state-1",
      state: "state-1",
    });

    assert.equal(result.status, "connected");
    assert.deepEqual(result.account, { id: "account-1", username: "andre" });
    assert.equal((saved[0] as { tokens: { accessToken: string } }).tokens.accessToken, "access");
  });
});
