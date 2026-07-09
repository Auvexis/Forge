import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Fastify from "fastify";

import auvexisAccountRoutes from "./auvexis-account-routes.ts";
import { createFileAuvexisOAuthTransactionStore } from "./auvexis-account-routes.ts";
import type { CompleteAuvexisCallbackInput } from "./auvexis-account-link-service.ts";

describe("Auvexis account routes", () => {
  it("preserves product subject across the OAuth callback transaction", async () => {
    const dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "sailor-auvexis-transaction-"),
    );
    const store = createFileAuvexisOAuthTransactionStore(dataDir);

    await store.save("profile-1", {
      authorizationUrl: new URL("https://accounts.auvexis.com/oauth"),
      state: "state-1",
      nonce: "nonce-1",
      codeVerifier: "verifier-1",
      createdAt: Date.now(),
      productSubject: {
        type: "local_profile",
        id: "profile-1",
      },
    });

    const consumed = await store.consume("profile-1", "state-1");

    assert.deepEqual(consumed?.productSubject, {
      type: "local_profile",
      id: "profile-1",
    });
  });

  it("starts OAuth and returns only the authorization URL", async () => {
    const app = Fastify();
    await app.register(auvexisAccountRoutes, {
      getActiveProfileId: () => "default",
      createService: () => ({
        createAuthorization: async () => ({
          authorizationUrl: "https://accounts.auvexis.com/oauth?state=state-1",
          state: "state-1",
          nonce: "nonce-1",
          codeVerifier: "verifier-1",
          createdAt: 1,
        }),
      }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/auvexis/account/connect/start",
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(body.data, {
      authorizationUrl: "https://accounts.auvexis.com/oauth?state=state-1",
    });
    assert.equal(JSON.stringify(body).includes("codeVerifier"), false);
  });

  it("completes the OAuth callback", async () => {
    const app = Fastify();
    const calls: unknown[] = [];
    await app.register(auvexisAccountRoutes, {
      getActiveProfileId: () => "default",
      createService: () => ({
        completeCallback: async (input: CompleteAuvexisCallbackInput) => {
          calls.push(input);
          return {
            status: "connected",
            account: { id: "account-1", username: "andre" },
          };
        },
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/auvexis/account/connect/callback?code=abc&state=state-1",
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.data.status, "connected");
    assert.equal(
      (calls[0] as { profileId: string; state: string }).profileId,
      "default",
    );
    assert.equal((calls[0] as { state: string }).state, "state-1");
  });

  it("renders a browser-friendly callback result page", async () => {
    const app = Fastify();
    await app.register(auvexisAccountRoutes, {
      getActiveProfileId: () => "default",
      createService: () => ({
        completeCallback: async () => ({
          status: "connected",
          account: { id: "account-1", username: "andre" },
        }),
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/auvexis/account/connect/callback?code=abc&state=state-1",
      headers: { accept: "text/html" },
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] as string, /text\/html/);
    assert.match(response.body, /Auvexis account connected/);
    assert.match(response.body, /@andre/);
    assert.equal(response.body.includes("accessToken"), false);
  });

  it("returns safe account status without tokens", async () => {
    const app = Fastify();
    await app.register(auvexisAccountRoutes, {
      getActiveProfileId: () => "default",
      createService: () => ({
        getStatus: async () => ({
          status: "connected",
          account: { id: "account-1", username: "andre", badges: [] },
          lastValidatedAt: "2026-07-01T12:00:00.000Z",
        }),
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/auvexis/account",
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.data.status, "connected");
    assert.equal(JSON.stringify(body).includes("token"), false);
  });

  it("logs out locally and revokes remotely", async () => {
    const calls: string[] = [];
    const app = Fastify();
    await app.register(auvexisAccountRoutes, {
      getActiveProfileId: () => "default",
      createService: () => ({
        logoutLocal: async () => {
          calls.push("logout");
          return { status: "disconnected" };
        },
        revokeRemote: async () => {
          calls.push("revoke");
          return { status: "disconnected" };
        },
      }),
    });

    const logout = await app.inject({
      method: "POST",
      url: "/auvexis/account/logout",
    });
    const revoke = await app.inject({
      method: "POST",
      url: "/auvexis/account/revoke",
    });

    assert.equal(logout.statusCode, 200);
    assert.equal(revoke.statusCode, 200);
    assert.deepEqual(calls, ["logout", "revoke"]);
  });

  it("requires an active Sailor profile", async () => {
    const app = Fastify();
    await app.register(auvexisAccountRoutes, {
      getActiveProfileId: () => null,
      createService: () => ({}),
    });

    const response = await app.inject({
      method: "GET",
      url: "/auvexis/account",
    });
    const body = response.json();

    assert.equal(response.statusCode, 409);
    assert.equal(body.error, "AUVEXIS_PROFILE_REQUIRED");
  });
});
