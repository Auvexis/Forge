import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { PluginManager } from "../modules/plugins/manager.ts";
import { PluginExecutor } from "../modules/plugins/executor.ts";
import { CredentialStore } from "../modules/plugins/credential-store.ts";
import { Vault } from "../modules/plugins/vault.ts";
import { z } from "zod";
import type {
  CredentialSchema,
  OAuth2Provider,
  ApiKeyProvider,
} from "../../shared/models/plugin-types.ts";

export default async function pluginsRoutes(fastify: FastifyInstance) {
  /**
   * Helper to send standardized responses with proper HTTP status codes
   */
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

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
    }));

    return sendResponse(reply, {
      status_code: 200,
      message: "Plugins fetched successfully",
      error: null,
      data,
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

      // Filter out ENV-locked fields — they cannot be overridden via the UI
      const filtered: Record<string, string> = {};
      for (const [key, value] of Object.entries(submitted)) {
        if (!lockedFields.has(key)) {
          filtered[key] = value;
        }
      }

      CredentialStore.saveCredentials(pluginId, filtered);

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
            // Convert file to absolute data for the plugin (Buffer)
            params[part.fieldname] = await part.toBuffer();
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
      const plugin = PluginManager.getPlugin(pluginId);

      if (plugin.auth.type !== "oauth2") {
        return sendResponse(reply, {
          status_code: 400,
          message: "Plugin does not support OAuth2",
          error: null,
          data: null,
        });
      }

      // Merge stored credentials with ENV vault (ENV takes precedence)
      const provider = plugin.auth as OAuth2Provider;
      const storedCredentials = CredentialStore.getCredentials(pluginId) ?? {};
      const credentials = Vault.mergeWithStored(
        pluginId,
        provider.credentialSchema,
        storedCredentials,
      );

      if (!credentials || Object.keys(credentials).length === 0) {
        return sendResponse(reply, {
          status_code: 400,
          message:
            "Credentials not found. Please configure Client ID/Secret first.",
          error: null,
          data: null,
        });
      }

      const redirectUri = PluginManager.getRedirectUri(pluginId);
      const url = await provider.getAuthUrl(credentials, redirectUri);

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
   * Sends an HTML page that posts a message back to the opener window.
   * Values are serialized with JSON.stringify to prevent XSS injection,
   * and postMessage targets the known client origin only.
   */
  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:8033";

  const buildOAuthCallbackHtml = (payload: Record<string, unknown>): string => {
    const serialized = JSON.stringify(payload);
    return `
      <html>
        <body>
          <script>
            window.opener.postMessage(${serialized}, ${JSON.stringify(
              CLIENT_ORIGIN,
            )});
            window.close();
          </script>
        </body>
      </html>
    `;
  };

  fastify.get("/plugins/:pluginId/auth/callback", async (req, reply) => {
    const { pluginId } = req.params as { pluginId: string };
    const query = req.query as { code?: string; error?: string };

    if (query.error || !query.code) {
      return reply
        .code(200)
        .type("text/html")
        .send(
          buildOAuthCallbackHtml({
            type: "oauth-error",
            plugin: pluginId,
            error: query.error || "no_code",
          }),
        );
    }

    try {
      const plugin = PluginManager.getPlugin(pluginId);

      if (plugin.auth.type !== "oauth2") {
        return reply
          .code(200)
          .type("text/html")
          .send(
            buildOAuthCallbackHtml({
              type: "oauth-error",
              plugin: pluginId,
              error: "not_oauth2",
            }),
          );
      }

      // Merge stored credentials with ENV vault (ENV takes precedence)
      const provider = plugin.auth as OAuth2Provider;
      const storedCredentials = CredentialStore.getCredentials(pluginId) ?? {};
      const credentials = Vault.mergeWithStored(
        pluginId,
        provider.credentialSchema,
        storedCredentials,
      );

      if (!credentials || Object.keys(credentials).length === 0) {
        return reply
          .code(200)
          .type("text/html")
          .send(
            buildOAuthCallbackHtml({
              type: "oauth-error",
              plugin: pluginId,
              error: "no_credentials",
            }),
          );
      }

      const redirectUri = PluginManager.getRedirectUri(pluginId);
      const tokens = await provider.exchangeCode(
        query.code,
        credentials,
        redirectUri,
      );

      CredentialStore.saveTokens(pluginId, tokens);

      return reply
        .code(200)
        .type("text/html")
        .send(
          buildOAuthCallbackHtml({
            type: "oauth-success",
            plugin: pluginId,
          }),
        );
    } catch (err: any) {
      return reply
        .code(200)
        .type("text/html")
        .send(
          buildOAuthCallbackHtml({
            type: "oauth-error",
            plugin: pluginId,
            error: err.message || "unknown_error",
          }),
        );
    }
  });
}
