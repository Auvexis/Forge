import type {
  FabricPlugin,
  OAuth2Provider,
  PluginContext,
} from "@auvexis/fabric-sdk";
import { PluginManager } from "./manager.ts";
import { CredentialStore } from "./credential-store.ts";
import { Vault } from "./vault.ts";
import { validateParams, PluginValidationError } from "./validator.ts";
import { OAuth2Service } from "./auth/oauth2-service.ts";
import { isDeclarativeOAuth2Auth, isLegacyOAuth2Auth } from "./auth/oauth2-types.ts";
import type { CustomOAuth2Auth, OAuth2DeclarativeAuth } from "./auth/oauth2-types.ts";
import type { OAuth2Tokens } from "@auvexis/fabric-sdk";
import { materializePluginData } from "./data-contracts/fabric-file-contract.ts";

export { PluginValidationError };

/** Refresh tokens if they expire within this window (5 minutes) */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface RefreshOAuth2TokensInput {
  pluginId: string;
  auth: OAuth2DeclarativeAuth | CustomOAuth2Auth | OAuth2Provider;
  tokens?: OAuth2Tokens;
  credentials: Record<string, string>;
  now?: () => number;
  saveTokens?: (pluginId: string, tokens: OAuth2Tokens) => void;
  oauth2Service?: Pick<OAuth2Service, "refreshTokens">;
}

export async function refreshOAuth2TokensIfNeeded(input: RefreshOAuth2TokensInput): Promise<OAuth2Tokens | undefined> {
  const now = input.now ?? Date.now;
  const saveTokens = input.saveTokens ?? CredentialStore.saveTokens.bind(CredentialStore);

  if (!input.tokens?.expires_at || now() < input.tokens.expires_at - TOKEN_REFRESH_BUFFER_MS) {
    return input.tokens;
  }

  if (!input.tokens.refresh_token) {
    return input.tokens;
  }

  try {
    let refreshed: OAuth2Tokens | undefined;
    if (isDeclarativeOAuth2Auth(input.auth)) {
      const service = input.oauth2Service ?? new OAuth2Service();
      refreshed = await service.refreshTokens({
        auth: input.auth,
        tokens: input.tokens,
        credentials: input.credentials,
      });
    } else if (isLegacyOAuth2Auth(input.auth) && input.auth.refreshTokens) {
      refreshed = await input.auth.refreshTokens(input.tokens, input.credentials);
    }

    if (refreshed) {
      saveTokens(input.pluginId, refreshed);
      return refreshed;
    }

    return input.tokens;
  } catch (err: any) {
    throw new Error(`Token refresh failed for plugin ${input.pluginId}: ${err.message}`);
  }
}

export const PluginExecutor = {
  execute: async (
    pluginId: string,
    methodName: string,
    params: Record<string, any>,
  ) => {
    const plugin: FabricPlugin = PluginManager.getPlugin(pluginId);

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
    let credentials: Record<string, string> =
      schema
        ? Vault.mergeWithStored(pluginId, schema, storedCredentials)
        : storedCredentials;

    // Resolve {{env.KEY}} expressions inside credentials
    credentials = Vault.resolveEnvExpressions(credentials);

    if (plugin.auth.type === "oauth2") {
      tokens = await refreshOAuth2TokensIfNeeded({
        pluginId,
        auth: plugin.auth as OAuth2Provider,
        tokens,
        credentials,
      });
    }

    const context: PluginContext = {
      credentials,
      tokens,
    };

    // ──────────── Schema Validation ────────────
    // Validate incoming params against the method's JSON Schema BEFORE cooking
    // or executing. This is a security gate: unknown fields are stripped by AJV
    // (`removeAdditional: true`) and type mismatches throw PluginValidationError,
    // which the route layer maps to HTTP 400 (not 500).
    const methodManifest = plugin.manifest.methods[methodName];
    const materializedParams = materializePluginData(params, methodManifest.parameters) as Record<string, any>;
    validateParams(pluginId, methodName, methodManifest.parameters, materializedParams);

    // ──────────── Parameter cooking (JSON Schema-driven) ────────────
    // The executor normalises raw params before passing them to the plugin method.
    // Rules are declared in the manifest under each property's x-input-type and format
    // fields — no plugin-specific magic lives here.
    const cookedParams: Record<string, any> = { ...materializedParams };
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

    return methodManifest.responseSchema
      ? materializePluginData(result, methodManifest.responseSchema)
      : result;
  },
};
