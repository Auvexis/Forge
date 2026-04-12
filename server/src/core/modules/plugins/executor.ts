import type {
  ForgePlugin,
  OAuth2Provider,
  PluginContext,
} from "../../../shared/models/plugin-types.ts";
import { PluginManager } from "./manager.ts";
import { CredentialStore } from "./credential-store.ts";

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

    const credentials = CredentialStore.getCredentials(pluginId) ?? {};
    let tokens = CredentialStore.getTokens(pluginId) ?? undefined;

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

    // Build context with credentials and tokens
    const context: PluginContext = {
      credentials,
      tokens,
    };

    // Generic parameter "cooking" based on manifest
    const cookedParams: Record<string, any> = { ...params };
    const methodManifest = plugin.manifest.methods[methodName];

    if (methodManifest && methodManifest.parameters) {
      for (const [key, paramConfig] of Object.entries(methodManifest.parameters) as [string, any][]) {
        const value = params[key];

        // Magic extraction for "Download/File Objects"
        if (
          value &&
          typeof value === "object" &&
          !Buffer.isBuffer(value) &&
          typeof (value as any).pipe !== "function"
        ) {
          if ("content" in (value as any)) {
            const fileObj = value as any;
            cookedParams[key] = fileObj.content;

            // Auto-propagate mimeType if it's missing in original params
            if (fileObj.mimeType && !params.mimeType) {
              cookedParams.mimeType = fileObj.mimeType;
            }
          }
        }

        if (cookedParams[key] instanceof Buffer) {
          if (paramConfig.isBase64) {
            // Legacy support: convert Buffer to base64 if plugin expects it
            cookedParams[key] = cookedParams[key].toString("base64");
          }
        }
      }
    }

    const result = await method(cookedParams, context);

    return result;
  },
};
