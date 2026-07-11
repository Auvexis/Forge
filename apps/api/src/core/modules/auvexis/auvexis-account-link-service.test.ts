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
  it("creates an OAuth authorization for the active Fabric profile", async () => {
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
                  fabric: {
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
                  fabric: {
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
            productId: "fabric",
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

  it("emits product events with the connected Auvexis account id", async () => {
    const calls: unknown[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        emitProductEvent: async (accessToken, event) => {
          calls.push({ accessToken, event });
          return {
            eventId: event.eventId,
            productId: "fabric",
            status: "accepted",
            outcomes: [],
          };
        },
      },
      storage: {
        read: () => connectedState,
        saveConnected: () => undefined,
      },
    });

    const result = await service.emitProductEvent({
      profileId: "default",
      eventId: "fabric.workflow.published:workflow-1",
      type: "fabric.workflow.published",
      evidence: { workflowId: "workflow-1" },
    });

    assert.equal(result.status, "accepted");
    assert.deepEqual(calls, [
      {
        accessToken: "access",
        event: {
          eventId: "fabric.workflow.published:workflow-1",
          type: "fabric.workflow.published",
          userId: "account-1",
          occurredAt: result.eventId
            ? (calls[0] as { event: { occurredAt: string } }).event.occurredAt
            : "",
          evidence: { workflowId: "workflow-1" },
        },
      },
    ]);
  });

  it("refreshes an expired token before retrying a product event", async () => {
    const calls: string[] = [];
    const saved: unknown[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        emitProductEvent: async (accessToken, event) => {
          calls.push(`emit:${accessToken}:${event.userId}`);
          if (accessToken === "access") {
            throw oauthError("reauth_required");
          }
          return {
            eventId: event.eventId,
            productId: "fabric",
            status: "accepted",
            outcomes: [],
          };
        },
        refresh: async (refreshToken) => {
          calls.push(`refresh:${refreshToken}`);
          return {
            accessToken: "access-2",
            refreshToken: "refresh-2",
            tokenType: "Bearer",
            scope: ["openid", "profile"],
          };
        },
      },
      storage: {
        read: () => connectedState,
        saveConnected: (input) => saved.push(input),
      },
    });

    const result = await service.emitProductEvent({
      profileId: "default",
      eventId: "fabric.workflow.published:workflow-1",
      type: "fabric.workflow.published",
    });

    assert.equal(result.status, "accepted");
    assert.deepEqual(calls, [
      "emit:access:account-1",
      "refresh:refresh",
      "emit:access-2:account-1",
    ]);
    assert.equal(
      (saved[0] as { tokens: { accessToken: string } }).tokens.accessToken,
      "access-2",
    );
  });

  it("skips emitting product events when campaign status is already claimed", async () => {
    const calls: string[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        getProductCampaignStatuses: async (accessToken, trigger) => {
          calls.push(`status:${accessToken}:${trigger}`);
          return [
            {
              id: "campaign-1",
              slug: "bee-event-2026",
              productId: "seed-fabric-product",
              status: "active",
              trigger: { type: "fabric.workflow.published" },
              startsAt: "2026-07-01T00:00:00.000Z",
              endsAt: "2026-08-01T00:00:00.000Z",
              capacity: 5,
              claimedCount: 1,
              activeNow: true,
              claimed: true,
              capacityReached: false,
              reason: "already_claimed",
              badge: { id: "badge-1", key: "bee", name: "Bee" },
            },
          ];
        },
        emitProductEvent: async () => {
          calls.push("emit");
          throw new Error("SHOULD_NOT_EMIT");
        },
      },
      storage: {
        read: () => connectedState,
        saveConnected: () => undefined,
      },
    });

    const result = await service.emitProductEvent({
      profileId: "default",
      eventId: "fabric.workflow.published:workflow-1",
      type: "fabric.workflow.published",
    });

    assert.deepEqual(calls, ["status:access:fabric.workflow.published"]);
    assert.deepEqual(result, {
      eventId: "fabric.workflow.published:workflow-1",
      productId: "seed-fabric-product",
      status: "accepted",
      outcomes: [
        {
          campaignId: "campaign-1",
          outcome: "already_claimed",
          reason: null,
        },
      ],
    });
  });

  it("skips emitting product events when campaign capacity is reached", async () => {
    const calls: string[] = [];
    const service = createAuvexisAccountLinkService({
      client: {
        createAuthorization: fakeCreateAuthorization,
        getProductCampaignStatuses: async () => [
          {
            id: "campaign-1",
            slug: "bee-event-2026",
            productId: "seed-fabric-product",
            status: "active",
            trigger: { type: "fabric.workflow.published" },
            startsAt: "2026-07-01T00:00:00.000Z",
            endsAt: "2026-08-01T00:00:00.000Z",
            capacity: 5,
            claimedCount: 5,
            activeNow: true,
            claimed: false,
            capacityReached: true,
            reason: "capacity_reached",
            badge: { id: "badge-1", key: "bee", name: "Bee" },
          },
        ],
        emitProductEvent: async () => {
          calls.push("emit");
          throw new Error("SHOULD_NOT_EMIT");
        },
      },
      storage: {
        read: () => connectedState,
        saveConnected: () => undefined,
      },
    });

    const result = await service.emitProductEvent({
      profileId: "default",
      eventId: "fabric.workflow.published:workflow-1",
      type: "fabric.workflow.published",
    });

    assert.deepEqual(calls, []);
    assert.deepEqual(result.outcomes, [
      {
        campaignId: "campaign-1",
        outcome: "ineligible",
        reason: "capacity_reached",
      },
    ]);
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
