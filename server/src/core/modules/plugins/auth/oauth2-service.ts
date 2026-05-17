import { createHash, randomBytes } from "node:crypto";
import type { OAuth2Tokens } from "@auvexis/sailor-sdk";
import type { OAuth2DeclarativeAuth, OAuth2TokenConfig } from "./oauth2-types.ts";

interface OAuth2ServiceDependencies {
  fetch?: typeof fetch;
  now?: () => number;
}

export interface CreateAuthorizationUrlInput {
  auth: OAuth2DeclarativeAuth;
  credentials: Record<string, string>;
  redirectUri: string;
  state: string;
  codeVerifier?: string;
}

export interface CreateAuthorizationUrlResult {
  url: string;
  codeVerifier?: string;
}

export interface ExchangeCodeInput {
  auth: OAuth2DeclarativeAuth;
  code: string;
  credentials: Record<string, string>;
  redirectUri: string;
  codeVerifier?: string;
}

export interface RefreshTokensInput {
  auth: OAuth2DeclarativeAuth;
  tokens: OAuth2Tokens;
  credentials: Record<string, string>;
}

function credential(credentials: Record<string, string>, field = "clientId"): string {
  const snakeCase = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return credentials[field] ?? credentials[snakeCase] ?? "";
}

function randomCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function s256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function mappedString(raw: Record<string, unknown>, path: string | undefined, fallback: string): string | undefined {
  const value = raw[path ?? fallback];
  return typeof value === "string" ? value : undefined;
}

function mappedNumber(raw: Record<string, unknown>, path: string | undefined, fallback: string): number | undefined {
  const value = raw[path ?? fallback];
  return typeof value === "number" ? value : undefined;
}

function buildTokenBody(params: Record<string, string>, contentType: "form" | "json"): BodyInit | string {
  if (contentType === "json") {
    return JSON.stringify(params);
  }

  return new URLSearchParams(params);
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return text ? JSON.parse(text) : {};
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text).entries());
  }

  return text ? { error: text } : {};
}

function readableOAuthError(raw: Record<string, unknown>): string {
  return String(raw.error_description ?? raw.error ?? "OAuth2 token request failed");
}

function mapTokens(raw: Record<string, unknown>, auth: OAuth2DeclarativeAuth, now: number): OAuth2Tokens {
  const mapping = auth.token.responseMapping ?? {};
  const accessToken = mappedString(raw, mapping.accessToken, "access_token");

  if (!accessToken) {
    throw new Error("OAuth2 token response did not include an access token");
  }

  const expiresIn = mappedNumber(raw, mapping.expiresIn, "expires_in");
  const expiresAt = mappedNumber(raw, mapping.expiresAt, "expires_at");

  return {
    access_token: accessToken,
    refresh_token: mappedString(raw, mapping.refreshToken, "refresh_token"),
    expires_at: expiresAt ?? (expiresIn ? now + expiresIn * 1000 : undefined),
    token_type: mappedString(raw, mapping.tokenType, "token_type"),
    scope: mappedString(raw, mapping.scope, "scope"),
    raw,
  };
}

export class OAuth2Service {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  constructor(dependencies: OAuth2ServiceDependencies = {}) {
    this.fetchImpl = dependencies.fetch ?? fetch;
    this.now = dependencies.now ?? Date.now;
  }

  static createAuthorizationUrl(input: CreateAuthorizationUrlInput): Promise<CreateAuthorizationUrlResult> {
    return new OAuth2Service().createAuthorizationUrl(input);
  }

  async createAuthorizationUrl(input: CreateAuthorizationUrlInput): Promise<CreateAuthorizationUrlResult> {
    const { auth, credentials, redirectUri, state } = input;
    const url = new URL(auth.authorization.url);
    const clientId = credential(credentials, auth.token.clientAuth?.clientIdField);
    const scope = auth.authorization.scope;
    const codeVerifier = auth.authorization.pkce?.enabled
      ? input.codeVerifier ?? randomCodeVerifier()
      : undefined;

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", auth.authorization.responseType ?? "code");
    url.searchParams.set("state", state);

    if (scope?.values.length) {
      url.searchParams.set(scope.paramName ?? "scope", scope.values.join(scope.separator ?? " "));
    }

    for (const [key, value] of Object.entries(auth.authorization.extraParams ?? {})) {
      url.searchParams.set(key, value);
    }

    if (codeVerifier) {
      url.searchParams.set("code_challenge", s256Challenge(codeVerifier));
      url.searchParams.set("code_challenge_method", "S256");
    }

    return { url: url.toString(), codeVerifier };
  }

  async exchangeCode(input: ExchangeCodeInput): Promise<OAuth2Tokens> {
    return this.requestTokens(input.auth, input.credentials, {
      ...(input.auth.token.exchangeParams ?? { grant_type: "authorization_code" }),
      code: input.code,
      redirect_uri: input.redirectUri,
      ...(input.codeVerifier ? { code_verifier: input.codeVerifier } : {}),
    });
  }

  async refreshTokens(input: RefreshTokensInput): Promise<OAuth2Tokens> {
    if (!input.tokens.refresh_token) {
      throw new Error("OAuth2 refresh failed: missing refresh token");
    }

    return this.requestTokens(input.auth, input.credentials, {
      ...(input.auth.token.refreshParams ?? { grant_type: "refresh_token" }),
      refresh_token: input.tokens.refresh_token,
    });
  }

  private async requestTokens(
    auth: OAuth2DeclarativeAuth,
    credentials: Record<string, string>,
    params: Record<string, string>,
  ): Promise<OAuth2Tokens> {
    const token = auth.token;
    const contentType = token.contentType ?? "form";
    const headers = new Headers();
    const bodyParams = { ...params };

    this.applyClientAuth(token, credentials, headers, bodyParams);
    headers.set("content-type", contentType === "json" ? "application/json" : "application/x-www-form-urlencoded");

    const response = await this.fetchImpl(token.url, {
      method: token.method ?? "POST",
      headers,
      body: buildTokenBody(bodyParams, contentType),
    });
    const raw = await parseResponse(response);

    if (!response.ok) {
      throw new Error(readableOAuthError(raw));
    }

    return mapTokens(raw, auth, this.now());
  }

  private applyClientAuth(
    token: OAuth2TokenConfig,
    credentials: Record<string, string>,
    headers: Headers,
    bodyParams: Record<string, string>,
  ): void {
    const clientAuth = token.clientAuth ?? { method: "body" as const };
    const clientId = credential(credentials, clientAuth.clientIdField);
    const clientSecret = credential(credentials, clientAuth.clientSecretField ?? "clientSecret");

    if (clientAuth.method === "basic") {
      headers.set("authorization", `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`);
      return;
    }

    if (clientAuth.method === "body") {
      bodyParams.client_id = clientId;
      bodyParams.client_secret = clientSecret;
    }
  }
}
