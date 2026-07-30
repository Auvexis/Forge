import type { FastifyInstance, FastifyReply } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { PluginManager } from "../modules/plugins/manager.ts";
import { PluginExecutor, PluginValidationError } from "../modules/plugins/executor.ts";
import { CredentialStore, isMaskedCredentialValue } from "../modules/plugins/credential-store.ts";
import { Vault } from "../modules/plugins/vault.ts";
import { getPluginRegistryDatabase } from "../modules/plugins/plugin-registry.ts";
import { fabricHomePaths } from "../runtime/fabric-home.ts";
import { ProfileStore } from "../profiles/profile-store.ts";
import { locatePluginRelease } from "../modules/plugins/external/plugin-release-locator.ts";
import {
  copyExtractedFolderToCache,
  resolveRepositoryUrlToCache,
} from "../modules/plugins/external/plugin-install-source-resolver.ts";
import { externalPluginPreviewStore } from "../modules/plugins/external/plugin-preview-store.ts";
import { readPluginManifestPreview } from "../modules/plugins/plugin-manifest-preview.ts";
import { installExternalPlugin } from "../modules/plugins/external/plugin-installer.ts";
import { OAuth2Service } from "../modules/plugins/auth/oauth2-service.ts";
import { oauth2SessionStore } from "../modules/plugins/auth/oauth2-session-store.ts";
import { isDeclarativeOAuth2Auth, isLegacyOAuth2Auth } from "../modules/plugins/auth/oauth2-types.ts";
import { validateOAuth2AuthorizationUrl } from "../modules/plugins/auth/oauth2-authorization-url.ts";
import { z } from "zod";
import type {
  CredentialSchema,
  OAuth2Provider,
  ApiKeyProvider,
} from "@auvexis/fabric-sdk";

const OAUTH2_AUTH_SESSION_TTL_MS = 10 * 60 * 1000;

export default async function pluginsRoutes(fastify: FastifyInstance) {
  /**
   * Helper to send standardized responses with proper HTTP status codes
   */
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  function createExternalPreview(localPath: string, source: any) {
    const release = locatePluginRelease(localPath);
    const preview = readPluginManifestPreview(release.manifestPath);
    return externalPluginPreviewStore.create({
      localPath,
      preview,
      release,
      source,
    });
  }

  function assertUploadRelativePath(relativePath: string): string {
    if (!relativePath || path.isAbsolute(relativePath)) {
      throw new Error("Invalid upload path");
    }

    const normalized = path.normalize(relativePath);
    if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
      throw new Error("Path traversal is not allowed in plugin uploads");
    }

    return normalized;
  }

  function createUploadPreviewFolder(): string {
    const destination = path.join(fabricHomePaths.pluginCacheDir, "uploads", randomUUID());
    fs.mkdirSync(destination, { recursive: true });
    return destination;
  }

  async function createOAuthConnectUrl(pluginId: string): Promise<string> {
    const plugin = PluginManager.getPlugin(pluginId);

    if (plugin.auth.type !== "oauth2") {
      throw new Error("Plugin does not support OAuth2");
    }

    const provider = plugin.auth as OAuth2Provider;
    const storedCredentials = CredentialStore.getCredentials(pluginId) ?? {};
    let credentials = Vault.mergeWithStored(
      pluginId,
      provider.credentialSchema,
      storedCredentials,
    );

    credentials = Vault.resolveEnvExpressions(credentials);

    if (!credentials || Object.keys(credentials).length === 0) {
      throw new Error("Credentials not found. Please configure Client ID/Secret first.");
    }

    const redirectUri = PluginManager.getRedirectUri(pluginId);
    if (isDeclarativeOAuth2Auth(provider)) {
      const state = randomUUID();
      const result = await OAuth2Service.createAuthorizationUrl({
        auth: provider,
        credentials,
        redirectUri,
        state,
      });

      oauth2SessionStore.save({
        state,
        pluginId,
        redirectUri,
        codeVerifier: result.codeVerifier,
        ttlMs: OAUTH2_AUTH_SESSION_TTL_MS,
      });
      return validateOAuth2AuthorizationUrl(result.url);
    }

    if (isLegacyOAuth2Auth(provider)) {
      return validateOAuth2AuthorizationUrl(await provider.getAuthUrl(credentials, redirectUri));
    }

    throw new Error("Invalid OAuth2 provider contract");
  }

  /**
   * Get all plugins (with status)
   */
  fastify.get("/plugins", async (req, reply) => {
    const plugins = PluginManager.getPlugins();

    const data = plugins.map((plugin) => ({
      id: plugin.id,
      manifest: plugin.manifest,
      status: CredentialStore.getPluginStatus(
        plugin.id,
        plugin.auth.type,
        (plugin.auth as any).credentialSchema,
      ),
      auth_type: plugin.auth.type,
      credential_schema: (plugin.auth as any).credentialSchema ?? null,
    }));

    return sendResponse(reply, {
      status_code: 200,
      message: "Plugins fetched successfully",
      error: null,
      data,
    });
  });

  const PreviewUrlSchema = z.object({
    repositoryUrl: z.string().url(),
  });

  fastify.post("/plugins/external/preview-url", async (req, reply) => {
    const validation = PreviewUrlSchema.safeParse(req.body);
    if (!validation.success) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Invalid request parameters",
        error: validation.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", "),
        data: null,
      });
    }

    try {
      const source = resolveRepositoryUrlToCache(validation.data.repositoryUrl, fabricHomePaths.pluginCacheDir);
      const preview = createExternalPreview(source.localPath, source.metadata);
      return sendResponse(reply, {
        status_code: preview.status === "ready" ? 200 : 400,
        message: preview.status === "ready" ? "External plugin preview created" : "External plugin manifest is invalid",
        error: preview.errors.length > 0 ? preview.errors.join("; ") : null,
        data: preview,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to create external plugin preview",
        error: error.message,
        data: null,
      });
    }
  });

  const PreviewFolderSchema = z.object({
    folderPath: z.string().min(1),
    files: z.array(z.string()).optional(),
  });

  fastify.post("/plugins/external/preview-folder", async (req, reply) => {
    const validation = PreviewFolderSchema.safeParse(req.body);
    if (!validation.success) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Invalid request parameters",
        error: validation.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", "),
        data: null,
      });
    }

    try {
      const source = copyExtractedFolderToCache(validation.data.folderPath, fabricHomePaths.pluginCacheDir, {
        allowedRelativePaths: validation.data.files,
      });
      const preview = createExternalPreview(source.localPath, source.metadata);
      return sendResponse(reply, {
        status_code: preview.status === "ready" ? 200 : 400,
        message: preview.status === "ready" ? "External plugin preview created" : "External plugin manifest is invalid",
        error: preview.errors.length > 0 ? preview.errors.join("; ") : null,
        data: preview,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to create external plugin preview",
        error: error.message,
        data: null,
      });
    }
  });

  fastify.post("/plugins/external/preview-upload", async (req, reply) => {
    if (!req.isMultipart()) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Expected multipart plugin upload",
        error: "multipart_required",
        data: null,
      });
    }

    const uploadFolder = createUploadPreviewFolder();
    let uploadedFiles = 0;
    let uploadedBytes = 0;
    const maxFiles = 5_000;
    const maxBytes = 50 * 1024 * 1024;

    try {
      for await (const part of req.parts()) {
        if (part.type !== "file") continue;

        const relativePath = assertUploadRelativePath(part.filename);
        const destination = path.join(uploadFolder, relativePath);
        fs.mkdirSync(path.dirname(destination), { recursive: true });

        const buffer = await part.toBuffer();
        uploadedFiles += 1;
        uploadedBytes += buffer.byteLength;

        if (uploadedFiles > maxFiles) {
          throw new Error("Plugin upload file count limit exceeded");
        }

        if (uploadedBytes > maxBytes) {
          throw new Error("Plugin upload size limit exceeded");
        }

        fs.writeFileSync(destination, buffer);
      }

      if (uploadedFiles === 0) {
        throw new Error("No plugin files uploaded");
      }

      const preview = createExternalPreview(uploadFolder, {
        type: "extracted_folder",
        originalValue: `${uploadedFiles} uploaded file${uploadedFiles === 1 ? "" : "s"}`,
        cachedAt: new Date().toISOString(),
      });

      return sendResponse(reply, {
        status_code: preview.status === "ready" ? 200 : 400,
        message: preview.status === "ready" ? "External plugin preview created" : "External plugin manifest is invalid",
        error: preview.errors.length > 0 ? preview.errors.join("; ") : null,
        data: preview,
      });
    } catch (error: any) {
      fs.rmSync(uploadFolder, { recursive: true, force: true });
      return sendResponse(reply, {
        status_code: 400,
        message: "Failed to create external plugin preview",
        error: error.message,
        data: null,
      });
    }
  });

  const InstallExternalSchema = z.object({
    previewId: z.string().min(1),
    scope: z.enum(["current_profile", "selected_profile", "all_profiles"]),
    profileId: z.string().optional(),
  });

  fastify.post("/plugins/external/install", async (req, reply) => {
    const validation = InstallExternalSchema.safeParse(req.body);
    if (!validation.success) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Invalid request parameters",
        error: validation.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", "),
        data: null,
      });
    }

    const preview = externalPluginPreviewStore.get(validation.data.previewId);
    const localPath = externalPluginPreviewStore.getLocalPath(validation.data.previewId);
    if (!preview || !localPath || !preview.release || preview.status !== "ready") {
      return sendResponse(reply, {
        status_code: 404,
        message: "External plugin preview not found or expired",
        error: "preview_expired",
        data: null,
      });
    }

    try {
      const profileStore = new ProfileStore({ fabricHome: fabricHomePaths.home });
      const currentProfile = profileStore.getCurrentProfile();
      const selectedProfileId = validation.data.profileId;
      if (validation.data.scope === "selected_profile") {
        if (!selectedProfileId || !profileStore.getProfile(selectedProfileId)) {
          return sendResponse(reply, {
            status_code: 400,
            message: "Selected profile was not found",
            error: "profile_not_found",
            data: null,
          });
        }
      }

      const result = installExternalPlugin({
        releaseDir: preview.release.releaseDir,
        source: preview.source,
        scope: validation.data.scope,
        currentProfileId: currentProfile?.id ?? "default",
        selectedProfileId,
        registryDb: getPluginRegistryDatabase(),
      });
      externalPluginPreviewStore.remove(validation.data.previewId);

      return sendResponse(reply, {
        status_code: 200,
        message: "External plugin installed",
        error: null,
        data: result,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to install external plugin",
        error: error.message,
        data: null,
      });
    }
  });

  fastify.delete("/plugins/external/previews/:previewId", async (req, reply) => {
    const { previewId } = req.params as { previewId: string };
    externalPluginPreviewStore.remove(previewId);

    return sendResponse(reply, {
      status_code: 200,
      message: "External plugin preview cancelled",
      error: null,
      data: null,
    });
  });

  /**
   * Get plugin by id (with status)
   */
  fastify.get("/plugins/:pluginId", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };

    try {
      const plugin = PluginManager.getPlugin(pluginId);

      return sendResponse(reply, {
        status_code: 200,
        message: "Plugin fetched successfully",
        error: null,
        data: {
          id: plugin.id,
          manifest: plugin.manifest,
          status: CredentialStore.getPluginStatus(
            plugin.id,
            plugin.auth.type,
            (plugin.auth as any).credentialSchema,
          ),
          auth_type: plugin.auth.type,
        },
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 404,
        message: "Plugin not found",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Get plugin status (the single predictable endpoint for frontend)
   */
  fastify.get("/plugins/:pluginId/status", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };

    try {
      const plugin = PluginManager.getPlugin(pluginId);
      // Get credential schema from provider (if exists)
      const credentialSchema = (plugin.auth as any).credentialSchema as
        | CredentialSchema
        | undefined;

      const status = CredentialStore.getPluginStatus(
        pluginId,
        plugin.auth.type,
        credentialSchema,
      );
      const credentials = CredentialStore.getCredentials(pluginId);

      // Identify ENV-locked fields
      const lockedFields = credentialSchema
        ? Array.from(Vault.getLockedFields(pluginId, credentialSchema))
        : [];

      // Mask sensitive fields for frontend
      let maskedCredentials: Record<string, string> | null = null;
      if (credentials && credentialSchema) {
        const sensitiveFields = Object.entries(credentialSchema)
          .filter(([_, field]) => field.inputType === "password")
          .map(([key]) => key);
        maskedCredentials = CredentialStore.maskCredentials(
          credentials,
          sensitiveFields,
        );
      }

      let oauth_ui = undefined;
      let oauth_redirect_uri = undefined;
      let oauth_public_url_required = false;
      let oauth_public_url_warning = undefined;
      if (plugin.auth.type === "oauth2") {
        oauth_ui = (plugin.auth as OAuth2Provider).ui;
        oauth_redirect_uri = PluginManager.getRedirectUri(pluginId);
        const usesLocalRedirect = PluginManager.isLocalRedirectUri(oauth_redirect_uri);
        oauth_public_url_required = false;
        if (usesLocalRedirect) {
          oauth_public_url_warning =
            "Using a local OAuth callback. Register the redirect URL above with the provider.";
        }
      }

      return sendResponse(reply, {
        status_code: 200,
        message: "Status fetched successfully",
        error: null,
        data: {
          status,
          auth_type: plugin.auth.type,
          credential_schema: credentialSchema,
          credentials: maskedCredentials,
          locked_fields: lockedFields,
          oauth_ui,
          oauth_redirect_uri,
          oauth_public_url_required,
          oauth_public_url_warning,
        },
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 404,
        message: "Plugin not found",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Save credentials for a plugin
   */
  fastify.post("/plugins/:pluginId/credentials", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };
    const submitted = req.body as Record<string, string>;

    try {
      // Determine which fields, if any, are ENV-locked
      const plugin = PluginManager.getPlugin(pluginId);
      const schema = (plugin.auth as any).credentialSchema as CredentialSchema | undefined;
      const lockedFields = schema ? Vault.getLockedFields(pluginId, schema) : new Set<string>();
      const existingCredentials = CredentialStore.getCredentials(pluginId) ?? {};
      const sensitiveFields = schema
        ? new Set(
            Object.entries(schema)
              .filter(([_, field]) => field.inputType === "password")
              .map(([key]) => key),
          )
        : new Set<string>();

      // Filter out ENV-locked fields — they cannot be overridden via the UI
      const filtered: Record<string, string> = {};
      for (const [key, value] of Object.entries(submitted)) {
        if (lockedFields.has(key)) {
          continue;
        }

        if (sensitiveFields.has(key) && isMaskedCredentialValue(value)) {
          if (existingCredentials[key]) {
            filtered[key] = existingCredentials[key];
          }
        } else {
          filtered[key] = value;
        }
      }

      CredentialStore.saveCredentials(pluginId, filtered);

      // Test connection if provider supports it
      if (plugin.auth.type === "api_key" && typeof (plugin.auth as any).testConnection === "function") {
        try {
          const resolvedTestCreds = Vault.resolveEnvExpressions(filtered);
          await (plugin.auth as any).testConnection(resolvedTestCreds);
        } catch (err: any) {
          // If test fails, we return a 400 so the UI shows the error to the user
          // The credentials are saved, but the user is immediately warned.
          return sendResponse(reply, {
            status_code: 400,
            message: `Connection test failed: ${err.message}`,
            error: err.message,
            data: null,
          });
        }
      }

      return sendResponse(reply, {
        status_code: 200,
        message: "Credentials saved successfully",
        error: null,
        data: lockedFields.size > 0
          ? { ignored_locked_fields: Array.from(lockedFields) }
          : null,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to save credentials",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Dynamic Options — Generic endpoint for `x-dynamic-options` fields.
   *
   * When a manifest declares `x-dynamic-options: { method: "listSpreadsheets" }`,
   * the frontend calls this endpoint to populate the dropdown without hardcoding values.
   *
   * Design decisions:
   * - Uses GET so browsers can cache the response (options rarely change).
   * - Passes empty params — dynamic-option methods must not require params.
   * - Returns an empty array (not an error) when the plugin is not yet connected,
   *   so the UI shows a helpful "no options available" state instead of an error toast.
   * - This route is GENERIC — it works for any plugin that implements `x-dynamic-options`.
   */
  fastify.get("/plugins/:pluginId/dynamic-options/:method", async (req, reply) => {
    const { pluginId, method } = req.params as { pluginId: string; method: string };

    try {
      const result = await PluginExecutor.execute(pluginId, method, {});
      const data = Array.isArray(result) ? result : [];

      return sendResponse(reply, {
        status_code: 200,
        message: "Dynamic options fetched successfully",
        error: null,
        data,
      });
    } catch (error: any) {
      // If the plugin is not configured/connected, return empty array — not an error state.
      // The UI should show "Connect plugin to load options" rather than a crash.
      if (
        error.message?.includes("not authorized") ||
        error.message?.includes("missing access token") ||
        error.message?.includes("not configured")
      ) {
        return sendResponse(reply, {
          status_code: 200,
          message: "Plugin not connected — options unavailable until authorized",
          error: null,
          data: [],
        });
      }

      return sendResponse(reply, {
        status_code: 500,
        message: `Failed to fetch dynamic options: ${error.message}`,
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Execute a plugin method
   */
  const ExecuteSchema = z.object({
    method: z.string().min(1),
    params: z.record(z.string(), z.any()).default({}),
  });

  fastify.post("/plugins/:pluginId/execute", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };
    let method: string;
    let params: Record<string, any>;

    try {
      if (req.isMultipart()) {
        params = {};
        method = "";

        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === "file") {
            // Store file as a rich object rather than just the buffer
            params[part.fieldname] = {
              content: await part.toBuffer(),
              filename: part.filename,
              mimeType: part.mimetype
            };
          } else {
            // Fields
            if (part.fieldname === "method") {
              method = part.value as string;
            } else {
              // Try to parse values if they look like JSON (for complex params in multipart)
              try {
                params[part.fieldname] = JSON.parse(part.value as string);
              } catch {
                params[part.fieldname] = part.value;
              }
            }
          }
        }

        if (!method) {
          return sendResponse(reply, {
            status_code: 400,
            message: "Missing 'method' field in multipart request",
            error: null,
            data: null,
          });
        }
      } else {
        // Standard JSON logic
        const validation = ExecuteSchema.safeParse(req.body);
        if (!validation.success) {
          return sendResponse(reply, {
            status_code: 400,
            message: "Invalid request parameters",
            error: validation.error.issues
              .map((e: any) => `${e.path.join(".")}: ${e.message}`)
              .join(", "),
            data: null,
          });
        }
        method = validation.data.method;
        params = validation.data.params;
      }

      const result = await PluginExecutor.execute(pluginId, method, params);

      return sendResponse(reply, {
        status_code: 200,
        message: "Method executed successfully",
        error: null,
        data: result,
      });
    } catch (error: any) {
      // Validation errors (bad input from the user/workflow) → 400 Bad Request
      if (error instanceof PluginValidationError) {
        return sendResponse(reply, {
          status_code: 400,
          message: "Invalid parameters",
          error: error.errors.join("; "),
          data: null,
        });
      }
      // Unexpected execution errors → 500 Internal Server Error
      return sendResponse(reply, {
        status_code: 500,
        message: `Execution failed: ${error.message}`,
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * OAuth Connect — generates the auth URL
   */
  fastify.post("/plugins/:pluginId/auth/connect", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };

    try {
      const url = await createOAuthConnectUrl(pluginId);

      return sendResponse(reply, {
        status_code: 200,
        message: "Auth URL generated",
        error: null,
        data: { url },
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to generate auth URL",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * OAuth Disconnect — removes tokens
   */
  fastify.post("/plugins/:pluginId/auth/disconnect", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };

    try {
      CredentialStore.deleteTokens(pluginId);

      return sendResponse(reply, {
        status_code: 200,
        message: "Disconnected successfully",
        error: null,
        data: null,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to disconnect",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * OAuth2 Callback — exchanges code for tokens
   *
   * Renders a final success/error page in the provider tab.
   */
  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildOAuthCallbackHtml = (
    status: "success" | "error",
    title: string,
    message: string,
  ): string => {
    const accent = status === "success" ? "#0f9f6e" : "#b42318";
    return `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #172033;
              background: #f6f7fb;
            }
            main {
              width: min(520px, calc(100vw - 32px));
              padding: 32px;
              border: 1px solid #d7dce7;
              border-radius: 8px;
              background: #fff;
              box-shadow: 0 16px 40px rgba(23, 32, 51, 0.12);
            }
            .status {
              width: 12px;
              height: 12px;
              border-radius: 999px;
              background: ${accent};
              margin-bottom: 20px;
            }
            h1 {
              margin: 0 0 12px;
              font-size: 24px;
              line-height: 1.2;
            }
            p {
              margin: 0;
              color: #4a5568;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <main>
            <div class="status" aria-hidden="true"></div>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(message)}</p>
          </main>
        </body>
      </html>`;
  };

  fastify.get("/plugins/:pluginId/auth/callback", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };
    const query = req.query as { code?: string; error?: string; error_description?: string; state?: string };

    if (query.error || !query.code) {
      return reply
        .code(200)
        .type("text/html")
        .send(
          buildOAuthCallbackHtml(
            "error",
            "OAuth connection failed",
            query.error_description || query.error || "The provider did not return an authorization code.",
          ),
        );
    }

    try {
      const plugin = PluginManager.getPlugin(pluginId);

      if (plugin.auth.type !== "oauth2") {
        return reply
          .code(200)
          .type("text/html")
          .send(
            buildOAuthCallbackHtml(
              "error",
              "OAuth connection failed",
              "This plugin does not support OAuth2.",
            ),
          );
      }

      // Merge stored credentials with ENV vault (ENV takes precedence)
      const provider = plugin.auth as OAuth2Provider;
      const storedCredentials = CredentialStore.getCredentials(pluginId) ?? {};
      let credentials = Vault.mergeWithStored(
        pluginId,
        provider.credentialSchema,
        storedCredentials,
      );

      // Resolve global variables
      credentials = Vault.resolveEnvExpressions(credentials);

      if (!credentials || Object.keys(credentials).length === 0) {
        return reply
          .code(200)
          .type("text/html")
          .send(
            buildOAuthCallbackHtml(
              "error",
              "OAuth connection failed",
              "Credentials are missing. Return to Fabric, save credentials, and try again.",
            ),
          );
      }

      const redirectUri = PluginManager.getRedirectUri(pluginId);
      let tokens;
      if (isDeclarativeOAuth2Auth(provider)) {
        const session = query.state ? oauth2SessionStore.consume(query.state) : null;
        if (!session || session.pluginId !== pluginId || session.redirectUri !== redirectUri) {
          return reply
            .code(200)
            .type("text/html")
            .send(
              buildOAuthCallbackHtml(
                "error",
                "OAuth connection failed",
                "The authorization session expired or is invalid. Return to Fabric and start the connection again.",
              ),
            );
        }

        const oauth2Service = new OAuth2Service();
        tokens = await oauth2Service.exchangeCode({
          auth: provider,
          code: query.code,
          credentials,
          redirectUri,
          codeVerifier: session.codeVerifier,
        });
      } else if (isLegacyOAuth2Auth(provider)) {
        tokens = await provider.exchangeCode(
          query.code,
          credentials,
          redirectUri,
        );
      } else {
        return reply
          .code(200)
          .type("text/html")
          .send(
            buildOAuthCallbackHtml(
              "error",
              "OAuth connection failed",
              "The plugin OAuth2 contract is invalid.",
            ),
          );
      }

      CredentialStore.saveTokens(pluginId, tokens);

      return reply
        .code(200)
        .type("text/html")
        .send(
          buildOAuthCallbackHtml(
            "success",
            "OAuth connection complete",
            "Tokens were saved. Return to Fabric and check the plugin connection status.",
          ),
        );
    } catch (err: any) {
      return reply
        .code(200)
        .type("text/html")
        .send(
          buildOAuthCallbackHtml(
            "error",
            "OAuth connection failed",
            err.message || "Unknown OAuth2 error.",
          ),
        );
    }
  });
}
