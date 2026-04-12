import type {
  ForgePlugin,
  OAuth2Provider,
  PluginContext,
} from "../../../shared/models/plugin-types.ts";
import { PluginManager } from "./manager.ts";
import { CredentialStore } from "./credential-store.ts";
import { Vault } from "./vault.ts";

/** Refresh tokens if they expire within this window (5 minutes) */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export const PluginExecutor = {
  execute: async (
    pluginId: string,
    methodName: string,
    params: Record<string, any>,
  ) => {
    const plugin: ForgePlugin = PluginManager.getPlugin(pluginId);

    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const method = plugin.methods[methodName];

    if (!method) {
      throw new Error(`Method ${methodName} not found in plugin ${pluginId}`);
    }

    const storedCredentials = CredentialStore.getCredentials(pluginId) ?? {};
    let tokens = CredentialStore.getTokens(pluginId) ?? undefined;

    // Merge ENV secrets with stored credentials (ENV takes precedence)
    const schema = (plugin.auth as any).credentialSchema;
    const credentials: Record<string, string> =
      schema
        ? Vault.mergeWithStored(pluginId, schema, storedCredentials)
        : storedCredentials;

    // Auto-refresh expired OAuth2 tokens before execution
    if (plugin.auth.type === "oauth2" && tokens?.expires_at) {
      const isExpired =
        Date.now() >= tokens.expires_at - TOKEN_REFRESH_BUFFER_MS;

      if (isExpired) {
        const provider = plugin.auth as OAuth2Provider;

        if (provider.refreshTokens && tokens.refresh_token) {
          try {
            tokens = await provider.refreshTokens(tokens, credentials);
            CredentialStore.saveTokens(pluginId, tokens);
          } catch (err: any) {
            throw new Error(
              `Token refresh failed for plugin ${pluginId}: ${err.message}`,
            );
          }
        }
      }
    }

    const context: PluginContext = {
      credentials,
      tokens,
    };

    // ──────────── Parameter cooking (JSON Schema-driven) ────────────
    // The executor normalises raw params before passing them to the plugin method.
    // Rules are declared in the manifest under each property's x-input-type and format
    // fields — no plugin-specific magic lives here.
    const cookedParams: Record<string, any> = { ...params };
    const methodManifest = plugin.manifest.methods[methodName];
    const schemaProperties = methodManifest?.parameters?.properties ?? {};

    for (const [key, paramSchema] of Object.entries(schemaProperties)) {
      const value = cookedParams[key];
      if (value === undefined || value === null) continue;

      // If a previous workflow step returned a file-object ({ content: Buffer, mimeType })
      // and the user mapped it to a parameter declared as x-input-type: "file",
      // unwrap the buffer so the plugin receives raw binary content directly.
      if (
        paramSchema["x-input-type"] === "file" &&
        typeof value === "object" &&
        !Buffer.isBuffer(value) &&
        typeof (value as any).pipe !== "function" &&
        "content" in (value as any)
      ) {
        const fileObj = value as any;
        cookedParams[key] = fileObj.content;
        // Auto-propagate mimeType if the plugin hasn't received it via another param
        if (fileObj.mimeType && !cookedParams.mimeType) {
          cookedParams.mimeType = fileObj.mimeType;
        }
      }

      // If a plugin declares format: "base64" for a parameter, convert
      // any raw Buffer value to a base64 string before calling the method.
      if (cookedParams[key] instanceof Buffer && paramSchema.format === "base64") {
        cookedParams[key] = (cookedParams[key] as Buffer).toString("base64");
      }
    }


    const result = await method(cookedParams, context);

    return result;
  },
};
