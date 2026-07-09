import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAuvexisAccountLinkService } from "./auvexis-account-link-service.ts";
import type {
  AuthorizationTransaction,
  AuvexisAccountsErrorCode,
  AuvexisProductSubject,
} from "@auvexis/accounts";
import { AuvexisAccountsError } from "@auvexis/accounts";

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
  input: {
    productSubject?: AuvexisProductSubject;
    prompt?: "login" | "select_account";
  } = {},
) => {
  void input;
  return fakeTransaction;
};

const connectedState = {
  version: 1 as const,
  status: "connected" as const,
  account: {
    id: "account-1",
    username: "andre",
    badges: [],
  },
  tokens: {
    accessToken: "access",
    refreshToken: "refresh",
    tokenType: "Bearer",
    scope: ["openid", "profile"],
  },
  connectedAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-01T12:00:00.000Z",
  lastValidatedAt: null,
};

const oauthError = (code: AuvexisAccountsErrorCode) =>
  new AuvexisAccountsError(code, code);

describe("Auvexis account link service", () => {
  it("creates an OAuth authorization for the active Sailor profile", async () => {
    const calls: unknown[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: async (
          input: {
            productSubject?: AuvexisProductSubject;
            prompt?: "login" | "select_account";
          } = {},
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
        prompt: "login",
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
            badges: [
              {
                id: "badge-1",
                slug: "donator",
                name: "Donator",
                style: {
                  backgroundColor: "#171A23",
                  borderColor: "#8067FF",
                  textColor: "#FFFFFF",
                },
                iconUrl: null,
                permissions: {
                  sailor: {
                    grantDonatorTheme: true,
                    createMoreThan6Workflows: true,
                  },
                },
                awardedAt: "2026-07-01T00:01:00.000Z",
              },
            ],
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
    assert.equal(
      (saved[0] as { tokens: { accessToken: string } }).tokens.accessToken,
      "access",
    );
  });

  it("returns status without exposing tokens and validates the live profile", async () => {
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        getProfile: async (accessToken) => {
          assert.equal(accessToken, "access");
          return {
            id: "account-1",
            username: "andre-live",
            joinedAt: "2026-07-01T00:00:00.000Z",
            linkedProviders: ["github"],
            badges: [
              {
                id: "badge-donator",
                slug: "donator",
                name: "Donator",
                style: {
                  backgroundColor: "#171A23",
                  borderColor: "#8067FF",
                  textColor: "#FFFFFF",
                },
                iconUrl: null,
                awardedAt: "2026-07-01T00:00:00.000Z",
                permissions: {
                  sailor: {
                    grantDonatorTheme: true,
                    createMoreThan6Workflows: true,
                  },
                },
              },
            ],
          };
        },
      },
      storage: {
        read: () => connectedState,
        saveConnected: () => undefined,
        markNeedsReconnect: () => undefined,
        clearLocal: () => undefined,
        markValidated: () => undefined,
      },
    });

    const result = await service.getStatus();

    assert.equal(result.status, "connected");
    assert.equal(result.account?.username, "andre-live");
    assert.deepEqual(result.capabilities, {
      canUseDonatorTheme: true,
      canCreateMoreThan6Workflows: true,
    });
    assert.equal("tokens" in result, false);
  });

  it("marks reconnect when live validation requires reauth", async () => {
    let markedReconnect = false;
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        getProfile: async () => {
          throw oauthError("reauth_required");
        },
      },
      storage: {
        read: () => connectedState,
        saveConnected: () => undefined,
        markNeedsReconnect: () => {
          markedReconnect = true;
        },
        clearLocal: () => undefined,
        markValidated: () => undefined,
      },
    });

    const result = await service.getStatus();

    assert.equal(result.status, "needs_reconnect");
    assert.equal(markedReconnect, true);
  });

  it("marks reconnect when the local profile authorization was replaced", async () => {
    let markedReconnect = false;
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        getProfile: async () => ({
          id: "account-1",
          username: "andre-live",
          joinedAt: "2026-07-01T00:00:00.000Z",
          linkedProviders: ["github"],
          badges: [],
        }),
        validateProductAuthorization: async (accessToken, subject) => {
          assert.equal(accessToken, "access");
          assert.deepEqual(subject, { type: "local_profile", id: "default" });
          return {
            active: false,
            productId: "sailor",
            userId: "account-1",
            subjectType: "local_profile",
            subjectId: "default",
          };
        },
      },
      storage: {
        read: () => connectedState,
        saveConnected: () => undefined,
        markNeedsReconnect: () => {
          markedReconnect = true;
        },
        clearLocal: () => undefined,
        markValidated: () => undefined,
      },
    });

    const result = await service.getStatus({ profileId: "default" });

    assert.equal(result.status, "needs_reconnect");
    assert.equal(markedReconnect, true);
  });

  it("clears local state without remote revocation", async () => {
    const calls: string[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        revoke: async () => calls.push("revoke"),
      },
      storage: {
        read: () => connectedState,
        saveConnected: () => undefined,
        markNeedsReconnect: () => undefined,
        clearLocal: () => calls.push("clear"),
        markValidated: () => undefined,
      },
    });

    await assert.doesNotReject(() => service.logoutLocal());
    assert.deepEqual(calls, ["clear"]);
  });

  it("revokes remotely with refresh token and clears local state", async () => {
    const calls: string[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        revoke: async (token) => calls.push(`revoke:${token}`),
      },
      storage: {
        read: () => connectedState,
        saveConnected: () => undefined,
        markNeedsReconnect: () => undefined,
        clearLocal: () => calls.push("clear"),
        markValidated: () => undefined,
      },
    });

    const result = await service.revokeRemote();

    assert.deepEqual(calls, ["revoke:refresh", "clear"]);
    assert.deepEqual(result, { status: "disconnected" });
  });
});
