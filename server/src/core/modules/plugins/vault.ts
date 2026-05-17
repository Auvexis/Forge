import type { CredentialSchema } from "@auvexis/sailor-sdk";
import { AppRepository } from "../app/app-repository.ts";

/**
 * ENV-based credential vault for Sailor plugins.
 *
 * Convention:
 *   SAILOR_PLUGIN_{PLUGIN_ID}_{FIELD_KEY}
 *
 * Examples:
 *   SAILOR_PLUGIN_GOOGLE_DRIVE_CLIENT_ID=xxx
 *   SAILOR_PLUGIN_GOOGLE_DRIVE_CLIENT_SECRET=yyy
 *   SAILOR_PLUGIN_GOOGLE_YOUTUBE_CLIENT_ID=xxx
 *
 * Plugin IDs with hyphens are converted to underscores.
 * Keys are uppercased.
 *
 * ENV values always take precedence over SQLite-stored credentials.
 * This allows administrators to lock down sensitive secrets while still
 * allowing users to configure non-sensitive fields through the UI.
 */
export const Vault = {
  /**
   * Derive the environment variable name for a given plugin/field combo.
   */
  envKey(pluginId: string, fieldKey: string): string {
    const normalizedId = pluginId.toUpperCase().replace(/-/g, "_");
    const normalizedKey = fieldKey.toUpperCase().replace(/-/g, "_");
    return `SAILOR_PLUGIN_${normalizedId}_${normalizedKey}`;
  },

  /**
   * Get a single secret from the environment.
   * Returns undefined if not set.
   */
  getSecret(pluginId: string, fieldKey: string): string | undefined {
    return process.env[this.envKey(pluginId, fieldKey)];
  },

  /**
   * Get all secrets defined in ENV for a plugin given a credential schema.
   * Only returns keys that are actually set in the environment.
   */
  getSecrets(pluginId: string, schema: CredentialSchema): Record<string, string> {
    const resolved: Record<string, string> = {};
    for (const key of Object.keys(schema)) {
      const value = this.getSecret(pluginId, key);
      if (value !== undefined) {
        resolved[key] = value;
      }
    }
    return resolved;
  },

  /**
   * Check which fields of a credential schema are provided via ENV.
   * Returns a set of field keys that are ENV-locked.
   */
  getLockedFields(pluginId: string, schema: CredentialSchema): Set<string> {
    const locked = new Set<string>();
    for (const key of Object.keys(schema)) {
      if (this.getSecret(pluginId, key) !== undefined) {
        locked.add(key);
      }
    }
    return locked;
  },

  /**
   * Merge ENV secrets with SQLite-stored credentials.
   * ENV values always win when present.
   */
  mergeWithStored(
    pluginId: string,
    schema: CredentialSchema,
    storedCredentials: Record<string, string> | null,
  ): Record<string, string> {
    const envSecrets = this.getSecrets(pluginId, schema);
    return {
      ...(storedCredentials ?? {}),
      ...envSecrets, // ENV overrides stored
    };
  },

  /**
   * Resolves {{env.KEY}} expressions in a credentials object.
   * This should be called right before a plugin executes, tests a connection,
   * or performs an OAuth2 flow.
   */
  resolveEnvExpressions(credentials: Record<string, string>): Record<string, string> {
    const envVars = AppRepository.getAllGlobalVariablesAsMap();
    const resolved: Record<string, string> = {};

    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === "string") {
        resolved[key] = value.replace(/\{\{\s*env\.([A-Za-z0-9_]+)\s*\}\}/g, (_, envKey) => {
          return envVars[envKey] !== undefined ? envVars[envKey] : `{{env.${envKey}}}`;
        });
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  },
};
