import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { OAuth2Service } from "./oauth2-service.ts";
import type { OAuth2DeclarativeAuth } from "./oauth2-types.ts";

function declarativeAuth(): OAuth2DeclarativeAuth {
  return {
    type: "oauth2",
    credentialSchema: {
      clientId: { type: "string", inputType: "text", label: "Client ID", required: true },
      clientSecret: { type: "string", inputType: "password", label: "Client Secret", required: true },
    },
    authorization: {
      url: "https://provider.example/oauth/authorize",
      responseType: "code",
      extraParams: { audience: "https://api.example" },
      scope: { values: ["read:user", "write:user"], separator: " " },
    },
    token: {
      url: "https://provider.example/oauth/token",
      contentType: "form",
      clientAuth: {
        method: "basic",
        clientIdField: "clientId",
        clientSecretField: "clientSecret",
      },
      exchangeParams: { grant_type: "authorization_code" },
      refreshParams: { grant_type: "refresh_token" },
      responseMapping: {
        accessToken: "access_token",
        refreshToken: "refresh_token",
        expiresIn: "expires_in",
        tokenType: "token_type",
        scope: "scope",
      },
    },
  };
}

describe("OAuth2Service", () => {
  it("generates authorization URLs with client, redirect, response type, scope and extra params", async () => {
    const result = await OAuth2Service.createAuthorizationUrl({
      auth: declarativeAuth(),
      credentials: { clientId: "abc", clientSecret: "secret" },
      redirectUri: "https://sailor.example/plugins/demo/auth/callback",
      state: "state-123",
    });

    const url = new URL(result.url);
    assert.equal(url.origin + url.pathname, "https://provider.example/oauth/authorize");
    assert.equal(url.searchParams.get("client_id"), "abc");
    assert.equal(url.searchParams.get("redirect_uri"), "https://sailor.example/plugins/demo/auth/callback");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("scope"), "read:user write:user");
    assert.equal(url.searchParams.get("audience"), "https://api.example");
    assert.equal(url.searchParams.get("state"), "state-123");
  });

  it("adds Basic client auth to token exchange requests", async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    const service = new OAuth2Service({
      fetch: async (url, init) => {
        request = { url: String(url), init };
        return new Response(JSON.stringify({ access_token: "access", expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
      now: () => 1_000,
    });

    const tokens = await service.exchangeCode({
      auth: declarativeAuth(),
      code: "code-123",
      credentials: { clientId: "abc", clientSecret: "secret" },
      redirectUri: "https://sailor.example/callback",
    });

    assert.equal(request?.url, "https://provider.example/oauth/token");
    assert.equal(request?.init?.headers instanceof Headers, true);
    assert.equal(
      (request?.init?.headers as Headers).get("authorization"),
      `Basic ${Buffer.from("abc:secret").toString("base64")}`,
    );
    assert.equal((request?.init?.body as URLSearchParams).get("client_id"), null);
    assert.equal(tokens.access_token, "access");
    assert.equal(tokens.expires_at, 3_601_000);
  });

  it("sends client credentials in the body when clientAuth.method is body", async () => {
    let body: URLSearchParams | undefined;
    const auth = declarativeAuth();
    auth.token.clientAuth!.method = "body";
    const service = new OAuth2Service({
      fetch: async (_url, init) => {
        body = init?.body as URLSearchParams;
        return Response.json({ access_token: "access" });
      },
    });

    await service.exchangeCode({
      auth,
      code: "code-123",
      credentials: { clientId: "abc", clientSecret: "secret" },
      redirectUri: "https://sailor.example/callback",
    });

    assert.equal(body?.get("client_id"), "abc");
    assert.equal(body?.get("client_secret"), "secret");
  });

  it("does not send client secret when clientAuth.method is none", async () => {
    let headers: Headers | undefined;
    let body: URLSearchParams | undefined;
    const auth = declarativeAuth();
    auth.token.clientAuth!.method = "none";
    const service = new OAuth2Service({
      fetch: async (_url, init) => {
        headers = init?.headers as Headers;
        body = init?.body as URLSearchParams;
        return Response.json({ access_token: "access" });
      },
    });

    await service.exchangeCode({
      auth,
      code: "code-123",
      credentials: { clientId: "abc", clientSecret: "secret" },
      redirectUri: "https://sailor.example/callback",
    });

    assert.equal(headers?.get("authorization"), null);
    assert.equal(body?.get("client_secret"), null);
  });

  it("generates PKCE S256 verifier and challenge", async () => {
    const auth = declarativeAuth();
    auth.authorization.pkce = { enabled: true, method: "S256" };

    const result = await OAuth2Service.createAuthorizationUrl({
      auth,
      credentials: { clientId: "abc", clientSecret: "secret" },
      redirectUri: "https://sailor.example/callback",
      state: "state-123",
      codeVerifier: "known-verifier",
    });

    const expectedChallenge = createHash("sha256")
      .update("known-verifier")
      .digest("base64url");
    const url = new URL(result.url);

    assert.equal(result.codeVerifier, "known-verifier");
    assert.equal(url.searchParams.get("code_challenge"), expectedChallenge);
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  });

  it("maps token responses using responseMapping", async () => {
    const service = new OAuth2Service({
      fetch: async () =>
        Response.json({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 60,
          token_type: "Bearer",
          scope: "read:user",
        }),
      now: () => 10_000,
    });

    const tokens = await service.exchangeCode({
      auth: declarativeAuth(),
      code: "code-123",
      credentials: { clientId: "abc", clientSecret: "secret" },
      redirectUri: "https://sailor.example/callback",
    });

    assert.deepEqual(tokens, {
      access_token: "access",
      refresh_token: "refresh",
      expires_at: 70_000,
      token_type: "Bearer",
      scope: "read:user",
      raw: {
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 60,
        token_type: "Bearer",
        scope: "read:user",
      },
    });
  });
});
