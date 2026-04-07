import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { PluginManager } from "../plugins/manager.ts";
import { PluginExecutor } from "../plugins/executor.ts";
import { CredentialStore } from "../plugins/credential-store.ts";
import type {
  PluginStatusResponse,
  CredentialSchema,
  OAuth2Provider,
  ApiKeyProvider,
} from "../../shared/models/plugin-types.ts";

export default async function pluginsRoutes(fastify: FastifyInstance) {
  /**
   * Get all plugins (with status)
   */
  fastify.get("/plugins", async (): Promise<ApiResponse<any[]>> => {
    const plugins = PluginManager.getPlugins();

    const data = plugins.map((plugin) => ({
      id: plugin.id,
      manifest: plugin.manifest,
      status: CredentialStore.getPluginStatus(plugin.id, plugin.auth.type),
      auth_type: plugin.auth.type,
    }));

    return {
      status_code: 200,
      message: "Plugins fetched successfully",
      error: null,
      data,
    };
  });

  /**
   * Get plugin by id (with status)
   */
  fastify.get("/plugins/:pluginId", async (req): Promise<ApiResponse<any>> => {
    const { pluginId } = req.params as { pluginId: string };

    try {
      const plugin = PluginManager.getPlugin(pluginId);

      return {
        status_code: 200,
        message: "Plugin fetched successfully",
        error: null,
        data: {
          id: plugin.id,
          manifest: plugin.manifest,
          status: CredentialStore.getPluginStatus(plugin.id, plugin.auth.type),
          auth_type: plugin.auth.type,
        },
      };
    } catch (error: any) {
      return {
        status_code: 404,
        message: "Plugin not found",
        error: error.message,
        data: null,
      };
    }
  });

  /**
   * Get plugin status (the single predictable endpoint for frontend)
   */
  fastify.get(
    "/plugins/:pluginId/status",
    async (req): Promise<ApiResponse<PluginStatusResponse>> => {
      const { pluginId } = req.params as { pluginId: string };

      try {
        const plugin = PluginManager.getPlugin(pluginId);
        const status = CredentialStore.getPluginStatus(
          pluginId,
          plugin.auth.type,
        );
        const credentials = CredentialStore.getCredentials(pluginId);

        // Get credential schema from provider
        let credentialSchema: CredentialSchema | null = null;
        if (plugin.auth.type !== "none") {
          credentialSchema = (plugin.auth as OAuth2Provider | ApiKeyProvider)
            .credentialSchema;
        }

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

        return {
          status_code: 200,
          message: "Plugin status fetched",
          error: null,
          data: {
            status,
            auth_type: plugin.auth.type,
            credential_schema: credentialSchema,
            credentials: maskedCredentials,
          },
        };
      } catch (error: any) {
        return {
          status_code: 404,
          message: "Plugin not found",
          error: error.message,
          data: null,
        };
      }
    },
  );

  /**
   * Save plugin credentials
   */
  fastify.post(
    "/plugins/:pluginId/credentials",
    async (req): Promise<ApiResponse<PluginStatusResponse>> => {
      const { pluginId } = req.params as { pluginId: string };
      const body = req.body as Record<string, string>;

      try {
        const plugin = PluginManager.getPlugin(pluginId);

        if (plugin.auth.type === "none") {
          return {
            status_code: 400,
            message: "This plugin does not require credentials",
            error: "auth_type is none",
            data: null,
          };
        }

        const schema = (plugin.auth as OAuth2Provider | ApiKeyProvider)
          .credentialSchema;

        // Validate required fields
        for (const [key, field] of Object.entries(schema)) {
          if (field.required && (!body[key] || body[key].trim() === "")) {
            return {
              status_code: 400,
              message: `Missing required field: ${key}`,
              error: `Field '${key}' is required`,
              data: null,
            };
          }
        }

        // When saving credentials, delete existing tokens (re-auth needed)
        CredentialStore.deleteTokens(pluginId);
        CredentialStore.saveCredentials(pluginId, body);

        // If api_key, test connection if available
        if (plugin.auth.type === "api_key") {
          const provider = plugin.auth as ApiKeyProvider;
          if (provider.testConnection) {
            try {
              await provider.testConnection(body);
            } catch (testErr: any) {
              return {
                status_code: 400,
                message: "Credentials saved but connection test failed",
                error: testErr.message,
                data: {
                  status: "error",
                  auth_type: plugin.auth.type,
                  credential_schema: schema,
                  credentials: body,
                  error: testErr.message,
                },
              };
            }
          }
        }

        const status = CredentialStore.getPluginStatus(
          pluginId,
          plugin.auth.type,
        );

        return {
          status_code: 200,
          message: "Credentials saved successfully",
          error: null,
          data: {
            status,
            auth_type: plugin.auth.type,
            credential_schema: schema,
            credentials: body,
          },
        };
      } catch (error: any) {
        return {
          status_code: 500,
          message: "Failed to save credentials",
          error: error.message,
          data: null,
        };
      }
    },
  );

  /**
   * Delete plugin credentials and tokens
   */
  fastify.delete(
    "/plugins/:pluginId/credentials",
    async (req): Promise<ApiResponse<null>> => {
      const { pluginId } = req.params as { pluginId: string };

      try {
        PluginManager.getPlugin(pluginId); // validate exists
        CredentialStore.deleteCredentials(pluginId);

        return {
          status_code: 200,
          message: "Credentials deleted",
          error: null,
          data: null,
        };
      } catch (error: any) {
        return {
          status_code: 404,
          message: "Plugin not found",
          error: error.message,
          data: null,
        };
      }
    },
  );

  /**
   * OAuth2 Connect — generates auth URL
   */
  fastify.post(
    "/plugins/:pluginId/auth/connect",
    async (req): Promise<ApiResponse<{ url: string } | null>> => {
      const { pluginId } = req.params as { pluginId: string };

      try {
        const plugin = PluginManager.getPlugin(pluginId);

        if (plugin.auth.type !== "oauth2") {
          return {
            status_code: 400,
            message: "This plugin does not use OAuth2",
            error: "auth_type is not oauth2",
            data: null,
          };
        }

        const credentials = CredentialStore.getCredentials(pluginId);
        if (!credentials) {
          return {
            status_code: 400,
            message:
              "Plugin credentials not configured. Save credentials first.",
            error: "missing_credentials",
            data: null,
          };
        }

        const provider = plugin.auth as OAuth2Provider;
        const redirectUri = PluginManager.getRedirectUri(pluginId);
        const authUrl = await provider.getAuthUrl(credentials, redirectUri);

        return {
          status_code: 200,
          message: "OAuth2 URL generated",
          error: null,
          data: { url: authUrl },
        };
      } catch (error: any) {
        return {
          status_code: 500,
          message: "Failed to generate auth URL",
          error: error.message,
          data: null,
        };
      }
    },
  );

  /**
   * OAuth2 Callback — exchanges code for tokens
   */
  fastify.get("/plugins/:pluginId/auth/callback", async (req, res) => {
    const { pluginId } = req.params as { pluginId: string };
    const query = req.query as { code?: string; error?: string };

    if (query.error || !query.code) {
      res.type("text/html").send(`
          <html>
            <body>
              <script>
                window.opener.postMessage(
                  { type: "oauth-error", plugin: "${pluginId}", error: "${query.error || "no_code"}" },
                  "*"
                );
                window.close();
              </script>
            </body>
          </html>
        `);
      return;
    }

    try {
      const plugin = PluginManager.getPlugin(pluginId);

      if (plugin.auth.type !== "oauth2") {
        res.type("text/html").send(`
            <html><body><script>
              window.opener.postMessage({ type: "oauth-error", plugin: "${pluginId}", error: "not_oauth2" }, "*");
              window.close();
            </script></body></html>
          `);
        return;
      }

      const credentials = CredentialStore.getCredentials(pluginId);
      if (!credentials) {
        res.type("text/html").send(`
            <html><body><script>
              window.opener.postMessage({ type: "oauth-error", plugin: "${pluginId}", error: "no_credentials" }, "*");
              window.close();
            </script></body></html>
          `);
        return;
      }

      const provider = plugin.auth as OAuth2Provider;
      const redirectUri = PluginManager.getRedirectUri(pluginId);
      const tokens = await provider.exchangeCode(
        query.code,
        credentials,
        redirectUri,
      );

      CredentialStore.saveTokens(pluginId, tokens);

      res.type("text/html").send(`
          <html>
            <body>
              <script>
                window.opener.postMessage(
                  { type: "oauth-success", plugin: "${pluginId}" },
                  "*"
                );
                window.close();
              </script>
            </body>
          </html>
        `);
    } catch (err: any) {
      res.type("text/html").send(`
          <html>
            <body>
              <script>
                window.opener.postMessage(
                  { type: "oauth-error", plugin: "${pluginId}", error: "${err.message?.replace(/"/g, '\\"')}" },
                  "*"
                );
                window.close();
              </script>
            </body>
          </html>
        `);
    }
  });

  /**
   * OAuth2 Disconnect — revokes tokens
   */
  fastify.post(
    "/plugins/:pluginId/auth/disconnect",
    async (req): Promise<ApiResponse<PluginStatusResponse | null>> => {
      const { pluginId } = req.params as { pluginId: string };

      try {
        const plugin = PluginManager.getPlugin(pluginId);

        if (plugin.auth.type !== "oauth2") {
          return {
            status_code: 400,
            message: "This plugin does not use OAuth2",
            error: "auth_type is not oauth2",
            data: null,
          };
        }

        const provider = plugin.auth as OAuth2Provider;
        const tokens = CredentialStore.getTokens(pluginId);
        const credentials = CredentialStore.getCredentials(pluginId);

        // Try to revoke tokens if provider supports it
        if (provider.revokeTokens && tokens && credentials) {
          try {
            await provider.revokeTokens(tokens, credentials);
          } catch {
            // Continue even if revoke fails
          }
        }

        CredentialStore.deleteTokens(pluginId);

        const status = CredentialStore.getPluginStatus(
          pluginId,
          plugin.auth.type,
        );
        const schema = provider.credentialSchema;

        return {
          status_code: 200,
          message: "Disconnected successfully",
          error: null,
          data: {
            status,
            auth_type: plugin.auth.type,
            credential_schema: schema,
            credentials: credentials,
          },
        };
      } catch (error: any) {
        return {
          status_code: 500,
          message: "Failed to disconnect",
          error: error.message,
          data: null,
        };
      }
    },
  );

  /**
   * Execute plugin method
   */
  fastify.post(
    "/plugins/:pluginId/execute",
    async (req): Promise<ApiResponse<any>> => {
      const { pluginId } = req.params as { pluginId: string };
      const { method, params } = req.body as {
        method: string;
        params: Record<string, any>;
      };

      try {
        const result = await PluginExecutor.execute(pluginId, method, params);

        return {
          status_code: 200,
          message: "Plugin method executed successfully",
          error: null,
          data: result,
        };
      } catch (error: any) {
        return {
          status_code: 500,
          message: "Failed to execute plugin method",
          error: error.message,
          data: null,
        };
      }
    },
  );
}
