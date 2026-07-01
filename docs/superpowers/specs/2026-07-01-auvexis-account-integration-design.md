# Auvexis Account Integration Design

## Objective

Connect one Auvexis Account to one local Sailor profile through OAuth 2.0 Authorization Code with PKCE. Auvexis Accounts remains authoritative for identity, badges, entitlements, and the active Sailor authorization. Sailor persists the connection securely and grants badge-based cosmetic benefits only after online backend validation.

## Scope

This design covers:

- The runtime-agnostic `@auvexis/accounts` npm SDK.
- Exclusive Auvexis authorization per account and product.
- Sailor account connection, local logout, remote revocation, persistence, and reauthentication.
- Backend validation of badges before granting Sailor benefits.

Verified plugin authorship and marketplace identity are explicitly deferred to a separate design.

## Trust Model

- Auvexis Accounts owns account identity, badges, entitlements, and OAuth authorization state.
- Sailor owns local profiles, encrypted token persistence, and the mapping from validated badges to Sailor capabilities.
- The Sailor frontend is never authoritative for tokens, badges, or capabilities.
- Local cached account data is never used for authorization.
- If Accounts cannot validate the connection online, Sailor hides Auvexis data and disables all badge-derived capabilities.
- Cosmetic local assets are not treated as DRM-protected. The security goal is to prevent ordinary manipulation of frontend state, local files, API payloads, and databases from producing an accepted entitlement.

## Product and Profile Cardinality

- One Auvexis account may have one active authorization for the Sailor OAuth client.
- Connecting that account from a new Sailor profile invalidates its previous Sailor authorization.
- The same Auvexis account may remain connected to other Auvexis products simultaneously.
- A Sailor installation maintains a local `account_id -> profile_id` index for cleanup and user experience, but Accounts enforces the security invariant.

## Accounts Authorization Model

Accounts stores one active authorization for each `(account_id, product_id)` pair. Issued access and refresh tokens reference a specific authorization generation or identifier.

Every protected Accounts request verifies that the referenced authorization remains active. Issuing a new Sailor authorization atomically replaces the previous one. This prevents an older Sailor profile from continuing to use an otherwise valid JWT until its expiration.

The resource server must validate issuer, audience, scopes, token lifetime, and active authorization. A complete integration test must exercise authorization, consent, code exchange, and `GET /v1/me/profile` to prevent audience drift between token issuance and resource validation.

## SDK: `@auvexis/accounts`

The SDK lives in the independent repository `C:\Workspace\Projects\auvexis-accounts` and is published publicly under the MIT license.

### Runtime contract

- TypeScript ESM.
- Node.js 20 or later.
- Runtime-agnostic implementation based on `fetch`, `URL`, and Web Crypto.
- Production base URL defaults to `https://accounts.auvexis.com`.
- Consumers may explicitly override the base URL for development and tests.
- OAuth endpoints are resolved from OIDC/OAuth discovery metadata.

### Responsibilities

- Generate cryptographically secure state, nonce, and PKCE S256 values.
- Build authorization requests.
- Exchange authorization codes.
- Refresh and revoke tokens.
- Validate issuer, audience, nonce, and protocol responses.
- Fetch and validate typed account profile and badge responses.
- Normalize errors into `reauth_required`, `unavailable`, `invalid_response`, and protocol errors.
- Prevent token values from appearing in errors.

### Non-responsibilities

- Opening a system browser.
- Hosting a loopback callback.
- Selecting a Sailor profile.
- Persisting or encrypting tokens.
- Mapping badges to product-specific benefits.
- Rendering user interface.

The SDK should use a standards-focused OAuth/OIDC implementation internally instead of implementing protocol cryptography from scratch.

## Sailor Architecture

The integration is a native Sailor feature, not a plugin. It must not use the plugin credential tables or expose Auvexis-specific behavior through generic plugin contracts.

Backend responsibilities belong in a focused Auvexis account module. Frontend responsibilities belong in an Auvexis account feature. The frontend communicates only with Sailor backend endpoints.

### Per-profile persistence

Each Sailor profile stores a dedicated Auvexis connection record containing:

- Auvexis account ID.
- Encrypted access token.
- Encrypted refresh token.
- Token expiration.
- Granted scopes.
- Connection status.
- Last successful verification time.
- Encrypted profile snapshot.

Tokens must not be stored through the current plaintext plugin token store. Encryption keys must be kept separately from the profile database using an operating-system-backed secret facility where supported, with a documented secure fallback for supported environments.

The persisted snapshot prevents needless data loss but is not returned to the frontend until Accounts validates the connection during the current Sailor session.

### Connection states

- `disconnected`: no local connection or local logout completed.
- `connecting`: an OAuth transaction is active.
- `connected`: Accounts validated the active authorization.
- `unavailable`: Accounts is temporarily unreachable; tokens remain, but data and capabilities are hidden.
- `reauth_required`: Accounts rejected or revoked the authorization; data and capabilities remain hidden until login succeeds again.
- `revocation_pending`: local data is hidden while Sailor retries an explicitly requested remote revocation.

Temporary network failures must not be interpreted as token revocation.

## OAuth Connection Flow

1. The active Sailor profile requests a connection.
2. Sailor creates state, nonce, and PKCE S256 values in backend memory with a short expiration and binds them to the initiating profile.
3. Sailor opens the system browser at the Accounts authorization endpoint.
4. Accounts authenticates the user and obtains consent.
5. Accounts redirects to the exact `http://127.0.0.1:<port>/oauth/callback` URI.
6. Sailor validates state and exchanges the code through the SDK.
7. Sailor fetches the profile from Accounts and confirms the active authorization.
8. Accounts atomically invalidates the previous Sailor authorization for the same account.
9. Sailor removes any local connection for that account from another profile.
10. Sailor encrypts and stores the new tokens and profile snapshot in the initiating profile.

If Sailor restarts or the user switches profiles during authorization, the in-memory transaction expires and the user starts again. Tokens are never returned to the frontend.

## Startup and Refresh

On startup or profile activation, Sailor silently validates the connection. It refreshes tokens when needed without opening a browser. The browser is opened again only when the refresh token is invalid, expired, or revoked.

Accounts unavailability transitions the connection to `unavailable`. Invalid authorization transitions it to `reauth_required`.

## Logout and Revocation

### Local logout

- Deletes local tokens, snapshot, and local account index entry.
- Does not require Accounts availability.
- Does not revoke authorizations for other products.

### Complete revocation

- Requests revocation from Accounts.
- Deletes local data after confirmed revocation.
- On temporary failure, hides all data and capabilities, records `revocation_pending`, and retries later.

### Profile deletion

- Attempts complete revocation.
- Always deletes local tokens and connection data, even if Accounts is unavailable.
- Never blocks profile deletion on a remote dependency.

## Profile and Badge Contract

Sailor profiles remain independent from Auvexis Accounts. Connecting does not overwrite the Sailor profile name, avatar, or email. The linked Auvexis identity is displayed separately.

For every account or capability request:

1. Sailor refreshes the token if necessary.
2. Sailor calls Accounts from its backend.
3. Accounts validates the token and active product authorization.
4. Accounts reads only active, non-revoked entitlements.
5. Sailor maps stable badge IDs or slugs to Sailor-specific capabilities.
6. Sailor returns verified presentation data and computed capabilities to its frontend.

The frontend cannot submit badges or capabilities. Badge names, colors, and icons are presentation metadata. Relative icon URLs returned by Accounts are normalized against the configured Accounts base URL.

An initial Sailor capability may map the `donator` badge to special themes. Without online validation, both the linked account presentation and the special themes remain unavailable.

## Cloudflare Deployment

The Accounts Worker is deployed at the custom domain `accounts.auvexis.com`. The Cloudflare zone must be active in the deployment account and the hostname must not have a conflicting CNAME.

The Workers Free and D1 Free tiers are acceptable for development and early production. Operational monitoring must track request, CPU, row-read, row-write, and storage limits. A campaign approaching 100,000 participants is expected to require the paid Workers tier because each participant can generate multiple database writes.

## Error Handling

- OAuth state, nonce, PKCE, issuer, or audience failures terminate the transaction without persistence.
- Token endpoint protocol errors are normalized without leaking codes, access tokens, or refresh tokens.
- Accounts 401 responses cause one refresh attempt only when a refresh token exists and has not expired; a second 401 causes `reauth_required`.
- Accounts 403 responses do not become authentication failures; Sailor reports missing scope or entitlement.
- Timeouts and 5xx responses cause `unavailable`, retain encrypted credentials, and grant no capabilities.
- Malformed Accounts responses cause `invalid_response`, expose no cached data, and grant no capabilities.
- Concurrent connection attempts are isolated by state and only the successfully completed active authorization wins.

## Verification Strategy

### SDK

- Unit tests for PKCE, state, nonce, URL construction, discovery, token parsing, refresh, revocation, schemas, and redacted errors.
- Contract tests against the local Accounts Worker.
- Runtime smoke tests on Node.js 20 and a Web Crypto-compatible worker environment.
- TypeScript build, typecheck, package content inspection, and clean consumer installation before publishing `0.1.0`.

### Accounts

- End-to-end authorization-code test through `GET /v1/me/profile`.
- Audience and scope validation tests.
- Tests proving a new Sailor authorization invalidates old access and refresh tokens.
- Atomic concurrency test for simultaneous connections.
- Tests proving other product authorizations remain active.
- Tests proving revoked entitlements disappear from profile responses.

### Sailor

- Tests for profile-bound OAuth state and callback expiration.
- Tests for encrypted per-profile token persistence.
- Tests proving tokens never reach frontend responses or logs.
- Tests for startup validation, refresh rotation, unavailability, and reauthentication.
- Tests for local logout, complete revocation, pending revocation, and profile deletion.
- Tests proving account reconnection cleans the previous local profile.
- Tests proving edited cache, frontend payloads, and local badge data cannot grant capabilities.

## Delivery Order

1. Create and publish `@auvexis/accounts@0.1.0` with protocol and contract tests.
2. Add active product authorization enforcement and end-to-end resource tests to Accounts.
3. Add the native per-profile Auvexis account integration to Sailor.
4. Add Sailor badge-to-capability mappings and special themes.
5. Design verified plugin authorship separately.
