# Auvexis Accounts SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and publish the runtime-agnostic `@auvexis/accounts@0.1.0` package for OAuth/OIDC and typed Auvexis Accounts access.

**Architecture:** Build a small TypeScript ESM client over `oauth4webapi`, exposing immutable authorization transactions and stateless token/profile operations. The package owns protocol validation and response schemas but never opens browsers, hosts callbacks, persists tokens, or maps badges to product capabilities.

**Tech Stack:** TypeScript 5.9, Vitest 4, oauth4webapi 3.8, Zod 4, Node.js 20+, Web Crypto, npm.

---

## File Structure

- `C:\Workspace\Projects\auvexis-accounts\package.json`: package metadata, scripts, exports, dependencies, and public publishing policy.
- `C:\Workspace\Projects\auvexis-accounts\tsconfig.json`: ESM production build.
- `C:\Workspace\Projects\auvexis-accounts\tsconfig.typecheck.json`: source and test typecheck.
- `C:\Workspace\Projects\auvexis-accounts\vitest.config.ts`: deterministic Node test environment.
- `C:\Workspace\Projects\auvexis-accounts\src\constants.ts`: production URL and default scopes.
- `C:\Workspace\Projects\auvexis-accounts\src\types.ts`: public inputs and outputs.
- `C:\Workspace\Projects\auvexis-accounts\src\errors.ts`: redacted SDK error model.
- `C:\Workspace\Projects\auvexis-accounts\src\schemas.ts`: runtime validation for discovery-independent Accounts payloads.
- `C:\Workspace\Projects\auvexis-accounts\src\oauth-client.ts`: discovery, PKCE, authorization, code exchange, refresh, and revocation.
- `C:\Workspace\Projects\auvexis-accounts\src\accounts-client.ts`: profile and badge resource requests.
- `C:\Workspace\Projects\auvexis-accounts\src\index.ts`: stable public exports.
- `C:\Workspace\Projects\auvexis-accounts\test\*.test.ts`: unit and HTTP contract tests.
- `C:\Workspace\Projects\auvexis-accounts\README.md`: consumer-facing integration guide.
- `C:\Workspace\Projects\auvexis-accounts\LICENSE`: MIT license.
- `C:\Workspace\Projects\auvexis-accounts\feats-map\auvexis-accounts-sdk-20260701.md`: short execution checklist required by project rules.

### Task 1: Scaffold the package on `dev`

**Files:**
- Create: `C:\Workspace\Projects\auvexis-accounts\package.json`
- Create: `C:\Workspace\Projects\auvexis-accounts\tsconfig.json`
- Create: `C:\Workspace\Projects\auvexis-accounts\tsconfig.typecheck.json`
- Create: `C:\Workspace\Projects\auvexis-accounts\vitest.config.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\.gitignore`
- Create: `C:\Workspace\Projects\auvexis-accounts\LICENSE`
- Create: `C:\Workspace\Projects\auvexis-accounts\README.md`
- Create: `C:\Workspace\Projects\auvexis-accounts\src\index.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\test\package.test.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\feats-map\auvexis-accounts-sdk-20260701.md`

- [ ] **Step 1: Initialize the repository and branch**

Run from `C:\Workspace\Projects`:

```powershell
New-Item -ItemType Directory -Path auvexis-accounts
git -C auvexis-accounts init -b dev
```

Expected: an empty repository on branch `dev`.

- [ ] **Step 2: Create the concise task map**

```markdown
# Auvexis Accounts SDK

- [ ] Scaffold package
- [ ] Add public contracts and safe errors
- [ ] Add OAuth/OIDC client
- [ ] Add profile client
- [ ] Add documentation and contract tests
- [ ] Verify and publish 0.1.0
```

- [ ] **Step 3: Create the failing package metadata test**

```ts
import { describe, expect, it } from "vitest";
import packageJson from "../package.json" with { type: "json" };

describe("package contract", () => {
  it("publishes a public ESM package with a single stable entrypoint", () => {
    expect(packageJson.name).toBe("@auvexis/accounts");
    expect(packageJson.version).toBe("0.1.0");
    expect(packageJson.type).toBe("module");
    expect(packageJson.publishConfig).toEqual({ access: "public" });
    expect(packageJson.exports).toHaveProperty(".");
  });
});
```

- [ ] **Step 4: Create package configuration**

```json
{
  "name": "@auvexis/accounts",
  "version": "0.1.0",
  "description": "Runtime-agnostic OAuth/OIDC client for Auvexis Accounts.",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:contract": "vitest run test/accounts.contract.test.ts",
    "typecheck": "tsc -p tsconfig.typecheck.json",
    "quality": "npm run build && npm run typecheck && npm test",
    "prepack": "npm run quality"
  },
  "keywords": ["auvexis", "oauth2", "oidc", "pkce", "accounts"],
  "license": "MIT",
  "engines": { "node": ">=20" },
  "publishConfig": { "access": "public" },
  "dependencies": {
    "oauth4webapi": "^3.8.6",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vitest": "^4.0.14"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "declaration": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src",
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": true, "rootDir": "." },
  "include": ["src/**/*.ts", "test/**/*.ts", "vitest.config.ts"]
}
```

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { environment: "node" } });
```

`.gitignore`:

```gitignore
node_modules/
dist/
*.tgz
coverage/
```

`src/index.ts`:

```ts
export {};
```

Use the standard MIT license text with copyright `2026 Auvexis` and a README containing the package name plus the sentence “OAuth/OIDC client for Auvexis Accounts.”

- [ ] **Step 5: Install and verify the scaffold**

Run:

```powershell
npm install
npm test
npm run typecheck
npm run build
```

Expected: all commands pass and `dist/index.js` plus `dist/index.d.ts` exist.

- [ ] **Step 6: Update the task map and commit**

Mark `Scaffold package` done, then run:

```powershell
git add .
git commit -m "chore: scaffold Auvexis Accounts SDK"
```

### Task 2: Define public contracts and redacted errors

**Files:**
- Create: `C:\Workspace\Projects\auvexis-accounts\src\constants.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\src\types.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\src\errors.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\src\schemas.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\test\contracts.test.ts`
- Modify: `C:\Workspace\Projects\auvexis-accounts\src\index.ts`

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from "vitest";
import {
  AuvexisAccountsError,
  DEFAULT_AUVEXIS_ACCOUNTS_URL,
  parseAuvexisProfile,
} from "../src/index.js";

describe("public contracts", () => {
  it("uses the production Accounts origin by default", () => {
    expect(DEFAULT_AUVEXIS_ACCOUNTS_URL).toBe("https://accounts.auvexis.com");
  });

  it("accepts canonical profiles and rejects malformed badges", () => {
    expect(parseAuvexisProfile({
      data: {
        id: "account-1",
        username: "andre",
        joinedAt: "2026-07-01T00:00:00.000Z",
        linkedProviders: ["github"],
        badges: [],
      },
    }).data.username).toBe("andre");
    expect(() => parseAuvexisProfile({ data: { badges: [{ slug: 42 }] } })).toThrow();
  });

  it("never serializes secret context", () => {
    const error = new AuvexisAccountsError("reauth_required", "Login required", {
      cause: new Error("refresh_token=auv_rt_secret"),
    });
    expect(JSON.stringify(error)).not.toContain("auv_rt_secret");
  });
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npm test -- contracts.test.ts`

Expected: FAIL because the public contracts do not exist.

- [ ] **Step 3: Implement constants, types, schemas, and errors**

```ts
export const DEFAULT_AUVEXIS_ACCOUNTS_URL = "https://accounts.auvexis.com";
export const DEFAULT_AUVEXIS_SCOPES = [
  "openid",
  "profile",
  "badges",
  "offline_access",
] as const;
```

```ts
export type AuvexisScope =
  | "openid"
  | "profile"
  | "email"
  | "badges"
  | "offline_access";

export interface AuvexisClientOptions {
  clientId: string;
  redirectUri: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export interface AuthorizationTransaction {
  authorizationUrl: URL;
  state: string;
  nonce: string;
  codeVerifier: string;
  createdAt: number;
}

export interface AuvexisTokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  scope: AuvexisScope[];
  expiresAt?: number;
}

export interface AuvexisBadge {
  id: string;
  slug: string;
  name: string;
  backgroundColor: string;
  borderColor: string;
  iconUrl: string;
  awardedAt: string;
}

export interface AuvexisProfile {
  id: string;
  username: string;
  email?: string;
  joinedAt: string;
  linkedProviders: Array<"google" | "github">;
  badges: AuvexisBadge[];
}
```

```ts
export type AuvexisAccountsErrorCode =
  | "reauth_required"
  | "unavailable"
  | "invalid_response"
  | "oauth_error";

export class AuvexisAccountsError extends Error {
  constructor(
    public readonly code: AuvexisAccountsErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AuvexisAccountsError";
  }

  toJSON() {
    return { name: this.name, code: this.code, message: this.message };
  }
}
```

```ts
import { z } from "zod";

const badgeSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/),
  borderColor: z.string().regex(/^#[0-9A-F]{6}$/),
  iconUrl: z.string().min(1),
  awardedAt: z.iso.datetime(),
});

const profileResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    email: z.email().optional(),
    joinedAt: z.iso.datetime(),
    linkedProviders: z.array(z.enum(["google", "github"])),
    badges: z.array(badgeSchema),
  }),
});

export const parseAuvexisProfile = (value: unknown) =>
  profileResponseSchema.parse(value);
```

Export every public declaration from `src/index.ts` with explicit `.js` specifiers.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- contracts.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Update the task map and commit**

Mark `Add public contracts and safe errors` done, then commit:

```powershell
git add src test feats-map
git commit -m "feat: define Accounts SDK contracts"
```

### Task 3: Implement discovery and authorization transactions

**Files:**
- Create: `C:\Workspace\Projects\auvexis-accounts\src\oauth-client.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\test\authorization.test.ts`
- Modify: `C:\Workspace\Projects\auvexis-accounts\src\index.ts`

- [ ] **Step 1: Write the failing authorization test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createAuvexisAccountsClient } from "../src/index.js";

describe("authorization", () => {
  it("discovers Accounts and creates a PKCE S256 request", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      issuer: "https://accounts.auvexis.com/api/auth",
      authorization_endpoint: "https://accounts.auvexis.com/api/auth/oauth2/authorize",
      token_endpoint: "https://accounts.auvexis.com/api/auth/oauth2/token",
      revocation_endpoint: "https://accounts.auvexis.com/api/auth/oauth2/revoke",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createAuvexisAccountsClient({
      clientId: "sailor",
      redirectUri: "http://127.0.0.1:23801/oauth/callback",
      fetch,
    });

    const transaction = await client.createAuthorization();

    expect(transaction.authorizationUrl.searchParams.get("response_type")).toBe("code");
    expect(transaction.authorizationUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(transaction.authorizationUrl.searchParams.get("state")).toBe(transaction.state);
    expect(transaction.authorizationUrl.searchParams.get("nonce")).toBe(transaction.nonce);
    expect(transaction.authorizationUrl.searchParams.get("scope")).toBe(
      "openid profile badges offline_access",
    );
    expect(transaction.codeVerifier.length).toBeGreaterThanOrEqual(43);
  });
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- authorization.test.ts`

Expected: FAIL because `createAuvexisAccountsClient` does not exist.

- [ ] **Step 3: Implement discovery and authorization creation**

Implement `createAuvexisAccountsClient(options)` in `src/oauth-client.ts` using:

```ts
import * as oauth from "oauth4webapi";
import {
  DEFAULT_AUVEXIS_ACCOUNTS_URL,
  DEFAULT_AUVEXIS_SCOPES,
} from "./constants.js";
import type {
  AuthorizationTransaction,
  AuvexisClientOptions,
  AuvexisScope,
} from "./types.js";

export function createAuvexisAccountsClient(options: AuvexisClientOptions) {
  const baseUrl = new URL(options.baseUrl ?? DEFAULT_AUVEXIS_ACCOUNTS_URL);
  const issuer = new URL("/api/auth", baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const client: oauth.Client = { client_id: options.clientId };
  let metadata: oauth.AuthorizationServer | undefined;

  async function discover(): Promise<oauth.AuthorizationServer> {
    if (metadata) return metadata;
    const response = await oauth.discoveryRequest(issuer, {
      algorithm: "oidc",
      [oauth.customFetch]: fetchImpl,
    });
    metadata = await oauth.processDiscoveryResponse(issuer, response);
    return metadata;
  }

  async function createAuthorization(input: {
    scopes?: readonly AuvexisScope[];
  } = {}): Promise<AuthorizationTransaction> {
    const server = await discover();
    if (!server.authorization_endpoint) {
      throw new Error("Accounts discovery has no authorization endpoint");
    }
    const codeVerifier = oauth.generateRandomCodeVerifier();
    const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
    const state = oauth.generateRandomState();
    const nonce = oauth.generateRandomNonce();
    const authorizationUrl = new URL(server.authorization_endpoint);
    authorizationUrl.searchParams.set("client_id", options.clientId);
    authorizationUrl.searchParams.set("redirect_uri", options.redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", (input.scopes ?? DEFAULT_AUVEXIS_SCOPES).join(" "));
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");
    return { authorizationUrl, state, nonce, codeVerifier, createdAt: Date.now() };
  }

  return { discover, createAuthorization };
}
```

Export the factory from `src/index.ts`.

- [ ] **Step 4: Run the authorization tests**

Run: `npm test -- authorization.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Update the task map and commit**

Keep the OAuth task open until grants are complete, then commit:

```powershell
git add src test
git commit -m "feat: create PKCE authorization requests"
```

### Task 4: Add callback exchange, refresh, and revocation

**Files:**
- Modify: `C:\Workspace\Projects\auvexis-accounts\src\oauth-client.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\src\token-mapper.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\test\tokens.test.ts`

- [ ] **Step 1: Write failing token lifecycle tests**

Create HTTP-backed tests that assert:

```ts
expect(await client.exchangeCode({
  callbackUrl: "http://127.0.0.1:23801/oauth/callback?code=code-1&state=state-1",
  transaction: { ...transaction, state: "state-1", nonce: "nonce-1" },
})).toMatchObject({ accessToken: "auv_at_1", refreshToken: "auv_rt_1" });

expect(await client.refresh("auv_rt_1")).toMatchObject({
  accessToken: "auv_at_2",
  refreshToken: "auv_rt_2",
});

await expect(client.revoke("auv_rt_2")).resolves.toBeUndefined();
```

The mocked server must assert `code_verifier`, `redirect_uri`, `client_id`, and `grant_type` request fields, and return OAuth errors containing fake secrets to verify that thrown errors remain redacted.

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- tokens.test.ts`

Expected: FAIL because token lifecycle methods are absent.

- [ ] **Step 3: Implement the token mapper**

```ts
import type { TokenEndpointResponse } from "oauth4webapi";
import type { AuvexisScope, AuvexisTokenSet } from "./types.js";

export function mapTokenSet(value: TokenEndpointResponse): AuvexisTokenSet {
  if (!value.access_token || !value.token_type) {
    throw new Error("Accounts token response is incomplete");
  }
  return {
    accessToken: value.access_token,
    refreshToken: value.refresh_token,
    idToken: value.id_token,
    tokenType: value.token_type,
    scope: (value.scope?.split(" ").filter(Boolean) ?? []) as AuvexisScope[],
    expiresAt: value.expires_in ? Date.now() + value.expires_in * 1000 : undefined,
  };
}
```

- [ ] **Step 4: Implement protocol methods with oauth4webapi**

Extend the client closure with `const clientAuth = oauth.None()` and implement:

```ts
async function exchangeCode(input: {
  callbackUrl: string;
  transaction: AuthorizationTransaction;
}): Promise<AuvexisTokenSet> {
  const server = await discover();
  const callback = new URL(input.callbackUrl);
  const parameters = oauth.validateAuthResponse(
    server,
    client,
    callback.searchParams,
    input.transaction.state,
  );
  const response = await oauth.authorizationCodeGrantRequest(
    server,
    client,
    clientAuth,
    parameters,
    options.redirectUri,
    input.transaction.codeVerifier,
    { [oauth.customFetch]: fetchImpl },
  );
  const result = await oauth.processAuthorizationCodeResponse(
    server,
    client,
    response,
    { expectedNonce: input.transaction.nonce, requireIdToken: true },
  );
  return mapTokenSet(result);
}

async function refresh(refreshToken: string): Promise<AuvexisTokenSet> {
  const server = await discover();
  const response = await oauth.refreshTokenGrantRequest(
    server,
    client,
    clientAuth,
    refreshToken,
    { [oauth.customFetch]: fetchImpl },
  );
  return mapTokenSet(await oauth.processRefreshTokenResponse(server, client, response));
}

async function revoke(token: string): Promise<void> {
  const server = await discover();
  const response = await oauth.revocationRequest(
    server,
    client,
    clientAuth,
    token,
    { [oauth.customFetch]: fetchImpl },
  );
  await oauth.processRevocationResponse(response);
}
```

Wrap each public protocol method with this redacting classifier; never concatenate the caught value into the public message:

```ts
function normalizeProtocolError(error: unknown): AuvexisAccountsError {
  if (error instanceof AuvexisAccountsError) return error;
  if (error instanceof oauth.ResponseBodyError && error.error === "invalid_grant") {
    return new AuvexisAccountsError("reauth_required", "Auvexis login is required");
  }
  if (error instanceof TypeError) {
    return new AuvexisAccountsError("unavailable", "Auvexis Accounts is unavailable");
  }
  if (error instanceof SyntaxError) {
    return new AuvexisAccountsError("invalid_response", "Accounts returned an invalid response");
  }
  return new AuvexisAccountsError("oauth_error", "Auvexis OAuth request failed");
}
```

- [ ] **Step 5: Run token and complete test suites**

Run: `npm test -- tokens.test.ts && npm test && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Update the task map and commit**

Mark `Add OAuth/OIDC client` done, then commit:

```powershell
git add src test feats-map
git commit -m "feat: support Accounts token lifecycle"
```

### Task 5: Add the typed Accounts profile client

**Files:**
- Create: `C:\Workspace\Projects\auvexis-accounts\src\accounts-client.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\test\profile.test.ts`
- Modify: `C:\Workspace\Projects\auvexis-accounts\src\index.ts`

- [ ] **Step 1: Write failing profile tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { createAuvexisAccountsClient } from "../src/index.js";

describe("Accounts profile", () => {
  it("fetches a validated profile and normalizes badge icon URLs", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ data: {
      id: "account-1",
      username: "andre",
      joinedAt: "2026-07-01T00:00:00.000Z",
      linkedProviders: ["github"],
      badges: [{
        id: "badge-1",
        slug: "donator",
        name: "Donator",
        backgroundColor: "#171A23",
        borderColor: "#8067FF",
        iconUrl: "/v1/badges/badge-1/icon",
        awardedAt: "2026-07-01T00:01:00.000Z",
      }],
    } }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createAuvexisAccountsClient({
      clientId: "sailor",
      redirectUri: "http://127.0.0.1:23801/oauth/callback",
      fetch,
    });

    const profile = await client.getProfile("auv_at_1");

    expect(profile.badges[0]?.iconUrl).toBe(
      "https://accounts.auvexis.com/v1/badges/badge-1/icon",
    );
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://accounts.auvexis.com/v1/me/profile"),
      expect.objectContaining({ headers: { authorization: "Bearer auv_at_1" } }),
    );
  });
});
```

Add this table-driven status coverage:

```ts
it.each([
  [401, "reauth_required"],
  [403, "oauth_error"],
  [500, "unavailable"],
] as const)("maps HTTP %s to %s", async (status, code) => {
  const client = createAuvexisAccountsClient({
    clientId: "sailor",
    redirectUri: "http://127.0.0.1:23801/oauth/callback",
    fetch: async () => new Response("{}", { status }),
  });
  await expect(client.getProfile("secret-token")).rejects.toMatchObject({ code });
});

it("maps transport and payload failures without exposing the token", async () => {
  const offline = createAuvexisAccountsClient({
    clientId: "sailor",
    redirectUri: "http://127.0.0.1:23801/oauth/callback",
    fetch: async () => { throw new TypeError("secret-token"); },
  });
  await expect(offline.getProfile("secret-token")).rejects.toMatchObject({
    code: "unavailable",
  });

  for (const body of ["not-json", JSON.stringify({ data: { badges: [{ slug: 42 }] } })]) {
    const invalid = createAuvexisAccountsClient({
      clientId: "sailor",
      redirectUri: "http://127.0.0.1:23801/oauth/callback",
      fetch: async () => new Response(body, { status: 200 }),
    });
    await expect(invalid.getProfile("secret-token")).rejects.toMatchObject({
      code: "invalid_response",
    });
  }
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- profile.test.ts`

Expected: FAIL because `getProfile` is absent.

- [ ] **Step 3: Implement profile retrieval**

```ts
import { AuvexisAccountsError } from "./errors.js";
import { parseAuvexisProfile } from "./schemas.js";
import type { AuvexisProfile } from "./types.js";

export async function getAuvexisProfile(input: {
  baseUrl: URL;
  accessToken: string;
  fetch: typeof globalThis.fetch;
}): Promise<AuvexisProfile> {
  let response: Response;
  try {
    response = await input.fetch(new URL("/v1/me/profile", input.baseUrl), {
      headers: { authorization: `Bearer ${input.accessToken}` },
    });
  } catch {
    throw new AuvexisAccountsError("unavailable", "Auvexis Accounts is unavailable");
  }
  if (response.status === 401) {
    throw new AuvexisAccountsError("reauth_required", "Auvexis login is required");
  }
  if (!response.ok) {
    throw new AuvexisAccountsError(
      response.status >= 500 ? "unavailable" : "oauth_error",
      "Auvexis Accounts rejected the profile request",
    );
  }
  try {
    const parsed = parseAuvexisProfile(await response.json()).data;
    return {
      ...parsed,
      badges: parsed.badges.map((badge) => ({
        ...badge,
        iconUrl: new URL(badge.iconUrl, input.baseUrl).toString(),
      })),
    };
  } catch {
    throw new AuvexisAccountsError("invalid_response", "Accounts returned an invalid profile");
  }
}
```

Expose `getProfile(accessToken)` from the client factory and export the public types.

- [ ] **Step 4: Run all verification**

Run: `npm test && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 5: Update the task map and commit**

Mark `Add profile client` done, then commit:

```powershell
git add src test feats-map
git commit -m "feat: fetch verified Accounts profiles"
```

### Task 6: Document, pack, consume, and publish `0.1.0`

**Files:**
- Modify: `C:\Workspace\Projects\auvexis-accounts\README.md`
- Create: `C:\Workspace\Projects\auvexis-accounts\test\exports.test.ts`
- Create: `C:\Workspace\Projects\auvexis-accounts\test\accounts.contract.test.ts`
- Modify: `C:\Workspace\Projects\auvexis-accounts\feats-map\auvexis-accounts-sdk-20260701.md`

- [ ] **Step 1: Add the public usage guide**

Document installation, client construction, browser opening as a consumer responsibility, transaction persistence prohibition, callback exchange, refresh token rotation, profile retrieval, revocation, error codes, production default URL, localhost override, and the rule that cached badges are not authorization evidence.

The complete primary example must use:

```ts
import { createAuvexisAccountsClient } from "@auvexis/accounts";

const accounts = createAuvexisAccountsClient({
  clientId: process.env.AUVEXIS_CLIENT_ID!,
  redirectUri: "http://127.0.0.1:23801/oauth/callback",
});

const transaction = await accounts.createAuthorization();
// The host application opens transaction.authorizationUrl in the system browser.
const tokens = await accounts.exchangeCode({ callbackUrl, transaction });
const profile = await accounts.getProfile(tokens.accessToken);
```

- [ ] **Step 2: Test the built public entrypoint**

```ts
import { describe, expect, it } from "vitest";

describe("built exports", () => {
  it("loads the package entrypoint", async () => {
    const sdk = await import("../dist/index.js");
    expect(sdk.createAuvexisAccountsClient).toBeTypeOf("function");
    expect(sdk.DEFAULT_AUVEXIS_ACCOUNTS_URL).toBe("https://accounts.auvexis.com");
  });
});
```

- [ ] **Step 3: Run release verification**

Create a live contract test that checks the current local Accounts surface without requiring interactive login:

```ts
import { describe, expect, it } from "vitest";

const baseUrl = process.env.AUVEXIS_CONTRACT_BASE_URL ?? "http://127.0.0.1:8787";

describe.runIf(process.env.AUVEXIS_CONTRACT === "1")("local Accounts contract", () => {
  it("publishes compatible discovery and protects the profile resource", async () => {
    const discovery = await fetch(`${baseUrl}/api/auth/.well-known/openid-configuration`);
    expect(discovery.status).toBe(200);
    const metadata = await discovery.json() as Record<string, unknown>;
    expect(metadata.issuer).toBe(`${baseUrl}/api/auth`);
    expect(metadata.authorization_endpoint).toBe(`${baseUrl}/api/auth/oauth2/authorize`);
    expect(metadata.token_endpoint).toBe(`${baseUrl}/api/auth/oauth2/token`);

    const profile = await fetch(`${baseUrl}/v1/me/profile`);
    expect(profile.status).toBe(401);
  });
});
```

Start the existing Accounts Worker in a hidden process, run the contract, and stop only that captured process:

```powershell
$accounts = Start-Process npm.cmd -ArgumentList "run", "dev", "--", "--port", "8787" -WorkingDirectory "C:\Workspace\Projects\accounts-auvexis-api" -WindowStyle Hidden -PassThru
try {
  $env:AUVEXIS_CONTRACT = "1"
  npm run test:contract
} finally {
  Remove-Item Env:AUVEXIS_CONTRACT -ErrorAction SilentlyContinue
  Stop-Process -Id $accounts.Id -ErrorAction SilentlyContinue
}
```

Expected: the discovery and unauthenticated resource contract passes.

- [ ] **Step 4: Run release verification**

Run:

```powershell
npm run quality
npm pack --dry-run
npm whoami
```

Expected:

- All tests, typecheck, and build pass.
- The package contains only `dist`, `README.md`, `LICENSE`, and package metadata.
- `npm whoami` returns the authenticated publisher account.

- [ ] **Step 5: Test installation from the tarball**

Run:

```powershell
npm pack
New-Item -ItemType Directory -Force "$env:TEMP\auvexis-accounts-consumer"
npm init -y --prefix "$env:TEMP\auvexis-accounts-consumer"
npm install --prefix "$env:TEMP\auvexis-accounts-consumer" "$PWD\auvexis-accounts-0.1.0.tgz"
Push-Location "$env:TEMP\auvexis-accounts-consumer"
node --input-type=module -e "import('@auvexis/accounts').then(m => console.log(m.DEFAULT_AUVEXIS_ACCOUNTS_URL))"
Pop-Location
```

Expected output: `https://accounts.auvexis.com`.

- [ ] **Step 6: Mark the task map complete and commit**

```powershell
git add README.md test feats-map
git commit -m "docs: prepare Accounts SDK release"
git status --short
```

Expected: clean worktree on `dev`.

- [ ] **Step 7: Publish the explicitly authorized public package**

Run:

```powershell
npm publish --access public
npm view @auvexis/accounts@0.1.0 name version dist-tags --json
```

Expected: npm reports `@auvexis/accounts@0.1.0` with the `latest` dist-tag. Do not modify package contents after publication without selecting and verifying a new semantic version.
