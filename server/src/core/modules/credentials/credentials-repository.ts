/**
 * CredentialsRepository — thin adapter over CredentialStore for the REST API layer.
 *
 * Both this and CredentialStore read/write the same `credentials.db` tables.
 * This module exists so the route layer has a clean, typed import without touching
 * the plugin-specific CredentialStore directly.
 */
export { CredentialStore as CredentialsRepository } from "../plugins/credential-store.ts";
