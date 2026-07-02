# Sailor Auvexis Backend OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete backend OAuth connection flow between a Sailor local profile and Auvexis Accounts, including secure per-profile storage, status, local logout, and remote revocation.

**Architecture:** Sailor keeps all OAuth tokens backend-only and profile-scoped. Auvexis Accounts remains the authority for identity, badges, and product authorization; Sailor stores only encrypted tokens plus a display-only profile snapshot. Fastify routes expose safe status/actions to the frontend and never return tokens.

**Tech Stack:** Node.js 22, TypeScript ESM, Fastify, `@auvexis/accounts@0.1.2`, profile-scoped filesystem/SQLite storage, Node test runner.

---

## Existing Context

Already implemented:

- `@auvexis/accounts@0.1.2` supports `productSubject`.
- `apps/api/src/core/modules/auvexis/auvexis-account-link-service.ts` creates an OAuth authorization with `productSubject: { type: "local_profile", id: profileId }`.
- `apps/api/src/core/server.ts` registers Fastify route modules and has access to `activeProfileRuntime`.
- Profile data lives under `resolveProfilePaths(...).dataDir`.

Preserve the current branch policy: work on `dev`, do not create a new branch, and commit after each task.

## File Structure

- Create `feats-map/auvexis-backend-oauth-20260701.md`: concise tracker.
- Modify `apps/api/src/core/modules/auvexis/auvexis-account-link-service.ts`: extend service with callback exchange, profile refresh, logout, and revoke orchestration.
- Create `apps/api/src/core/modules/auvexis/auvexis-account-storage.ts`: profile-scoped encrypted token and display snapshot persistence.
- Create `apps/api/src/core/modules/auvexis/auvexis-account-routes.ts`: Fastify routes for start, callback, status, logout, and revoke.
- Create `apps/api/src/core/modules/auvexis/auvexis-account-config.ts`: env parsing for Accounts client id, base URL, redirect URI, and token encryption secret.
- Modify `apps/api/src/core/server.ts`: register the new Auvexis routes with `activeProfileRuntime.activeProfileService` and `sailorHomePaths.home`.
- Add/extend tests in `apps/api/src/core/modules/auvexis/*.test.ts`.
- Keep `apps/api/src/core/modules/scheduler/scheduler.ts` unchanged unless build verification exposes a type regression.

## Route Contract

All route responses must follow Sailor's existing API response shape:

```ts
{
  status_code: number;
  message: string;
  error: string | null;
  data: unknown;
}
```

Routes:

- `POST /auvexis/account/connect/start`
  - Reads the active Sailor profile.
  - Creates an OAuth authorization.
  - Persists temporary transaction server-side.
  - Returns `{ authorizationUrl: string }`.

- `GET /auvexis/account/connect/callback`
  - Reads `code` and `state`.
  - Loads matching transaction.
  - Exchanges the code for tokens.
  - Fetches the Auvexis profile.
  - Persists encrypted tokens and display-only profile snapshot.
  - Returns a small success payload suitable for a local callback browser page.

- `GET /auvexis/account`
  - Returns `disconnected`, `connected`, or `needs_reconnect`.
  - Never returns access tokens, refresh tokens, code verifier, nonce, or state.
  - If live validation fails because reauth is needed, marks local state as `needs_reconnect`.

- `POST /auvexis/account/logout`
  - Removes local tokens and local cached profile data only.
  - Does not call Accounts revocation.

- `POST /auvexis/account/revoke`
  - Attempts remote token revocation.
  - Removes local data after remote revoke succeeds or after Accounts confirms the token is no longer usable.

## Storage Contract

Store one file per local Sailor profile:

```text
<profile dataDir>/auvexis-account.json
```

Persist this shape:

```ts
interface StoredAuvexisAccountConnection {
  version: 1;
  status: "connected" | "needs_reconnect" | "disconnected";
  account: {
    id: string;
    username: string;
    email?: string;
    badges: Array<{
      id: string;
      slug: string;
      name: string;
      backgroundColor: string;
      borderColor: string;
      iconUrl: string;
      awardedAt: string;
    }>;
  } | null;
  encryptedTokens: {
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    tokenType: string;
    scope: string[];
    expiresAt?: number;
  } | null;
  connectedAt: string | null;
  updatedAt: string;
  lastValidatedAt: string | null;
}
```

Store temporary OAuth transactions separately:

```text
<profile dataDir>/auvexis-oauth-transactions.json
```

Each transaction must expire after 10 minutes and be deleted after callback success/failure.

## Encryption Contract

Use AES-256-GCM with a required backend-only secret:

- Env var: `AUVEXIS_TOKEN_ENCRYPTION_SECRET`.
- Accept either:
  - 64 hex characters, or
  - any string with at least 32 UTF-8 bytes, hashed with SHA-256 into a 32-byte key.

Encrypted token field format:

```text
v1:<base64url iv>:<base64url authTag>:<base64url ciphertext>
```

Tests must prove raw token values are not present in the saved JSON.

## Task 1: Tracker and configuration

**Files:**
- Create: `feats-map/auvexis-backend-oauth-20260701.md`
- Create: `apps/api/src/core/modules/auvexis/auvexis-account-config.ts`
- Test: `apps/api/src/core/modules/auvexis/auvexis-account-config.test.ts`

- [ ] **Step 1: Create tracker**

```markdown
# Auvexis backend OAuth

- [ ] Add config validation
- [ ] Add encrypted profile storage
- [ ] Add OAuth callback service
- [ ] Add account status/logout/revoke service
- [ ] Add Fastify routes
- [ ] Verify backend OAuth flow
```

- [ ] **Step 2: Write failing config tests**

```ts
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
    assert.equal(config.redirectUri, "http://127.0.0.1:23801/auvexis/account/connect/callback");
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
```

- [ ] **Step 3: Run RED**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-config.test.ts
```

Expected: fails because `auvexis-account-config.ts` does not exist.

- [ ] **Step 4: Implement config**

```ts
export interface AuvexisAccountConfig {
  clientId: string;
  baseUrl: string;
  redirectUri: string;
  tokenEncryptionSecret: string;
}

export function loadAuvexisAccountConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuvexisAccountConfig {
  const clientId = required(env.AUVEXIS_CLIENT_ID, "AUVEXIS_CLIENT_ID");
  const tokenEncryptionSecret = required(
    env.AUVEXIS_TOKEN_ENCRYPTION_SECRET,
    "AUVEXIS_TOKEN_ENCRYPTION_SECRET",
  );
  if (Buffer.byteLength(tokenEncryptionSecret, "utf8") < 32) {
    throw new Error("AUVEXIS_TOKEN_ENCRYPTION_SECRET must be at least 32 bytes");
  }

  return {
    clientId,
    tokenEncryptionSecret,
    baseUrl: env.AUVEXIS_ACCOUNTS_URL ?? "https://accounts.auvexis.com",
    redirectUri:
      env.AUVEXIS_REDIRECT_URI ??
      "http://127.0.0.1:23801/auvexis/account/connect/callback",
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-config.test.ts
```

Expected: config tests pass.

Commit:

```powershell
git add feats-map/auvexis-backend-oauth-20260701.md apps/api/src/core/modules/auvexis/auvexis-account-config.ts apps/api/src/core/modules/auvexis/auvexis-account-config.test.ts
git commit -m "feat: configure Auvexis account OAuth"
```

## Task 2: Encrypted profile storage

**Files:**
- Create: `apps/api/src/core/modules/auvexis/auvexis-account-storage.ts`
- Test: `apps/api/src/core/modules/auvexis/auvexis-account-storage.test.ts`
- Modify: `feats-map/auvexis-backend-oauth-20260701.md`

- [ ] **Step 1: Write failing storage tests**

```ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { createAuvexisAccountStorage } from "./auvexis-account-storage.ts";

describe("Auvexis account storage", () => {
  it("encrypts tokens and round trips a connected account", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-auvexis-"));
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

    const raw = fs.readFileSync(path.join(dataDir, "auvexis-account.json"), "utf8");
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
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-auvexis-"));
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
```

- [ ] **Step 2: Run RED**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-storage.test.ts
```

Expected: fails because `auvexis-account-storage.ts` does not exist.

- [ ] **Step 3: Implement storage**

Implement:

- `createAuvexisAccountStorage({ dataDir, tokenEncryptionSecret, clock })`
- `read()`
- `saveConnected({ account, tokens })`
- `markNeedsReconnect()`
- `clearLocal()`
- AES-256-GCM helpers `encryptJson` and `decryptJson`

Use this public return shape from `read()`:

```ts
{
  version: 1,
  status,
  account,
  tokens,
  connectedAt,
  updatedAt,
  lastValidatedAt,
}
```

Use this default when the file does not exist:

```ts
{
  version: 1,
  status: "disconnected",
  account: null,
  tokens: null,
  connectedAt: null,
  updatedAt: new Date(0).toISOString(),
  lastValidatedAt: null,
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-storage.test.ts
```

Expected: storage tests pass.

Update tracker, then commit:

```powershell
git add feats-map/auvexis-backend-oauth-20260701.md apps/api/src/core/modules/auvexis/auvexis-account-storage.ts apps/api/src/core/modules/auvexis/auvexis-account-storage.test.ts
git commit -m "feat: store encrypted Auvexis account tokens"
```

## Task 3: OAuth transactions and callback exchange

**Files:**
- Modify: `apps/api/src/core/modules/auvexis/auvexis-account-link-service.ts`
- Test: `apps/api/src/core/modules/auvexis/auvexis-account-link-service.test.ts`
- Modify: `feats-map/auvexis-backend-oauth-20260701.md`

- [ ] **Step 1: Add failing service tests**

Add tests proving:

```ts
it("stores transaction state when starting OAuth", async () => {
  const saved: unknown[] = [];
  const service = createAuvexisAccountLinkService({
    client: fakeClient,
    transactions: {
      save: async (profileId, transaction) => saved.push({ profileId, transaction }),
      consume: async () => null,
    },
    storage: fakeStorage,
  });

  await service.createAuthorization({ profileId: "default" });

  assert.equal((saved[0] as { profileId: string }).profileId, "default");
});

it("exchanges callback, fetches profile, saves connection, and consumes transaction", async () => {
  const service = createAuvexisAccountLinkService({
    client: {
      createAuthorization: fakeCreateAuthorization,
      exchangeCode: async () => ({
        accessToken: "access",
        refreshToken: "refresh",
        tokenType: "Bearer",
        scope: ["openid", "profile"],
      }),
      getProfile: async () => ({
        id: "account-1",
        username: "andre",
        joinedAt: "2026-07-01T00:00:00.000Z",
        linkedProviders: ["github"],
        badges: [],
      }),
    },
    transactions: {
      save: async () => undefined,
      consume: async () => fakeTransaction,
    },
    storage: fakeStorage,
  });

  const result = await service.completeCallback({
    profileId: "default",
    callbackUrl: "http://127.0.0.1:23801/auvexis/account/connect/callback?code=abc&state=state-1",
    state: "state-1",
  });

  assert.equal(result.status, "connected");
});
```

- [ ] **Step 2: Run RED**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-link-service.test.ts
```

Expected: fails because transaction/callback APIs are missing.

- [ ] **Step 3: Extend service**

Add dependencies:

```ts
transactions: {
  save(profileId: string, transaction: AuvexisAccountLinkAuthorization): Promise<void> | void;
  consume(profileId: string, state: string): Promise<AuvexisAccountLinkAuthorization | null> | AuvexisAccountLinkAuthorization | null;
}
storage: {
  saveConnected(input: { account: StoredAuvexisAccount; tokens: AuvexisTokenSet }): void;
}
```

Add method:

```ts
completeCallback(input: {
  profileId: string;
  callbackUrl: string;
  state: string;
}): Promise<{ status: "connected"; account: { id: string; username: string } }>;
```

Callback rules:

- Missing transaction returns `AUVEXIS_OAUTH_STATE_EXPIRED`.
- `exchangeCode` receives the original transaction.
- `getProfile` uses the returned access token.
- Storage saves account snapshot and full tokens.
- Transaction is consumed once.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-link-service.test.ts
```

Expected: account link service tests pass.

Update tracker, then commit:

```powershell
git add feats-map/auvexis-backend-oauth-20260701.md apps/api/src/core/modules/auvexis/auvexis-account-link-service.ts apps/api/src/core/modules/auvexis/auvexis-account-link-service.test.ts
git commit -m "feat: complete Auvexis OAuth callback"
```

## Task 4: Status, logout, and remote revocation service

**Files:**
- Modify: `apps/api/src/core/modules/auvexis/auvexis-account-link-service.ts`
- Test: `apps/api/src/core/modules/auvexis/auvexis-account-link-service.test.ts`
- Modify: `feats-map/auvexis-backend-oauth-20260701.md`

- [ ] **Step 1: Add failing tests**

Add tests proving:

- `getStatus()` returns safe data with no tokens.
- `getStatus()` calls Accounts `getProfile(accessToken)` for connected accounts.
- `getStatus()` marks `needs_reconnect` when SDK throws `AuvexisAccountsError` with `code: "reauth_required"`.
- `logoutLocal()` clears local storage only.
- `revokeRemote()` calls SDK revoke on refresh token if present, otherwise access token, then clears local storage.

- [ ] **Step 2: Run RED**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-link-service.test.ts
```

Expected: fails because status/logout/revoke methods do not exist.

- [ ] **Step 3: Implement methods**

Add:

```ts
getStatus(): Promise<{
  status: "connected" | "needs_reconnect" | "disconnected";
  account: StoredAuvexisAccount | null;
  lastValidatedAt: string | null;
}>

logoutLocal(): Promise<{ status: "disconnected" }>

revokeRemote(): Promise<{ status: "disconnected" }>
```

Rules:

- Never expose `tokens`.
- If live validation succeeds, update snapshot and `lastValidatedAt`.
- If validation fails with `reauth_required`, call `storage.markNeedsReconnect()`.
- If validation fails with `unavailable`, return cached status but do not grant capabilities in future Donator checks.
- `revokeRemote()` must clear local storage after successful revoke.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-link-service.test.ts
```

Expected: service tests pass.

Update tracker, then commit:

```powershell
git add feats-map/auvexis-backend-oauth-20260701.md apps/api/src/core/modules/auvexis/auvexis-account-link-service.ts apps/api/src/core/modules/auvexis/auvexis-account-link-service.test.ts
git commit -m "feat: manage Auvexis account connection status"
```

## Task 5: Fastify routes

**Files:**
- Create: `apps/api/src/core/modules/auvexis/auvexis-account-routes.ts`
- Test: `apps/api/src/core/modules/auvexis/auvexis-account-routes.test.ts`
- Modify: `apps/api/src/core/server.ts`
- Modify: `feats-map/auvexis-backend-oauth-20260701.md`

- [ ] **Step 1: Write failing route tests**

Build a Fastify instance with fake service and active profile dependency. Test:

- `POST /auvexis/account/connect/start` returns only `authorizationUrl`.
- `GET /auvexis/account/connect/callback?code=abc&state=state-1` calls callback service.
- `GET /auvexis/account` returns safe status and no token fields.
- `POST /auvexis/account/logout` clears local state.
- `POST /auvexis/account/revoke` revokes remote state.
- Missing active profile returns 409 `AUVEXIS_PROFILE_REQUIRED`.

- [ ] **Step 2: Run RED**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-routes.test.ts
```

Expected: fails because route module does not exist.

- [ ] **Step 3: Implement route module**

Export:

```ts
export interface AuvexisAccountRoutesOptions {
  getActiveProfileId?: () => string | null;
  createService?: (profileId: string) => AuvexisAccountLinkService;
}

export default async function auvexisAccountRoutes(
  fastify: FastifyInstance,
  options: AuvexisAccountRoutesOptions = {},
) { ... }
```

Route implementation must:

- Read active profile id from `options.getActiveProfileId`.
- Use `createAuvexisAccountLinkService` with config, SDK client, storage, and transaction store in production path.
- Return existing Sailor API response shape.
- Never include token fields in response.

- [ ] **Step 4: Register in server**

Modify `apps/api/src/core/server.ts`:

```ts
import auvexisAccountRoutes from "./modules/auvexis/auvexis-account-routes.ts";
```

Register after profiles routes:

```ts
fastify.register(auvexisAccountRoutes, {
  getActiveProfileId: () =>
    activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? null,
});
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/auvexis-account-routes.test.ts
npm run build --workspace apps/api
```

Expected: route tests and API build pass.

Update tracker, then commit:

```powershell
git add feats-map/auvexis-backend-oauth-20260701.md apps/api/src/core/modules/auvexis/auvexis-account-routes.ts apps/api/src/core/modules/auvexis/auvexis-account-routes.test.ts apps/api/src/core/server.ts
git commit -m "feat: expose Auvexis account backend routes"
```

## Task 6: Final verification

**Files:**
- Modify: `feats-map/auvexis-backend-oauth-20260701.md`

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node --test --loader ts-node/esm apps/api/src/core/modules/auvexis/*.test.ts
```

Expected: all Auvexis backend tests pass.

- [ ] **Step 2: Run API build**

Run:

```powershell
npm run build --workspace apps/api
```

Expected: TypeScript build passes.

- [ ] **Step 3: Run monorepo build**

Run:

```powershell
npm run build
```

Expected: API and client build pass. Vite bundle-size warnings are acceptable if build exits zero.

- [ ] **Step 4: Manual route smoke without real Accounts**

Run the route tests with fake service only. Do not execute a real OAuth callback until Accounts dev server and Sailor OAuth client registration are configured.

- [ ] **Step 5: Mark tracker complete and commit**

Update tracker:

```markdown
- [x] Verify backend OAuth flow
```

Commit:

```powershell
git add feats-map/auvexis-backend-oauth-20260701.md
git commit -m "chore: verify Auvexis backend OAuth flow"
```

## Notes for the next plan

After this backend plan is complete, the next plan should cover:

1. Simple frontend connect/disconnect UI.
2. Browser launch behavior for local OAuth.
3. Donator badge capability endpoint.
4. Theme gating based on live backend validation.
