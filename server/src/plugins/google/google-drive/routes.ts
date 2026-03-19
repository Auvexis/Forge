import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../../shared/models/api-response.model.ts";
import GoogleDrivePlugin from "./index.ts";
import { google } from "googleapis";
import { driveDB } from "./database.ts";
import type { GoogleDriveOAuthModel } from "./models/plugin.model.ts";
import type { PluginModel } from "../../../shared/models/plugin.model.ts";

export default async function googleDrivePluginRoutes(
  fastify: FastifyInstance,
) {
  /**
   * Check plugin status
   */
  fastify.get(
    "/plugins/google-drive/status",
    async (req, res): Promise<ApiResponse<PluginModel>> => {
      const plugin = GoogleDrivePlugin;

      return {
        status_code: 200,
        message: "Google Drive plugin loaded",
        error: null,
        data: plugin,
      };
    },
  );

  /**
   * Update plugin config
   */
  fastify.put(
    "/plugins/google-drive/config",
    async (req, res): Promise<ApiResponse<PluginModel>> => {
      const { client_id, client_secret } = req.body as {
        client_id: string;
        client_secret: string;
      };

      const plugin = GoogleDrivePlugin;

      // DELETE OLD OAuth2 tokens
      driveDB.prepare("DELETE FROM oauth WHERE plugin_id = ?").run(plugin.id);

      // INSERT NEW OAuth2 tokens
      driveDB
        .prepare(
          "INSERT INTO oauth (plugin_id, client_id, client_secret) VALUES (?, ?, ?)",
        )
        .run(plugin.id, client_id, client_secret);

      return {
        status_code: 200,
        message: "Google Drive plugin configuration updated",
        error: null,
        data: plugin,
      };
    },
  );

  /**
   * OAuth2 Endpoints
   */
  fastify.post(
    "/plugins/google-drive/oauth2/connect",
    async (req, res): Promise<ApiResponse<{ url: string }>> => {
      const plugin = GoogleDrivePlugin;
      const pluginOAuthConfig = driveDB
        .prepare("SELECT * FROM oauth WHERE plugin_id = ?")
        .get(plugin.id) as GoogleDriveOAuthModel | undefined;

      if (!pluginOAuthConfig) {
        return {
          status_code: 404,
          message: "Plugin OAuth not configured",
          error: null,
          data: null,
        };
      }

      const { client_id, client_secret } = pluginOAuthConfig;

      if (!client_id || !client_secret) {
        return {
          status_code: 400,
          message: "Missing OAuth2 credentials",
          error: null,
          data: null,
        };
      }

      const redirectUri =
        "http://localhost:8032/plugins/google-drive/oauth2/callback";

      const oauth2Client = new google.auth.OAuth2({
        client_id,
        client_secret,
        redirectUri,
      });

      const scopes = ["https://www.googleapis.com/auth/drive"];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent",
      });

      return {
        status_code: 200,
        message: "OAuth2 URL generated",
        error: null,
        data: { url: authUrl },
      };
    },
  );

  fastify.get(
    "/plugins/google-drive/oauth2/callback",
    async (req, res): Promise<ApiResponse<null>> => {
      const query = req.query as { code?: string; scope?: string };

      if (!query.code) {
        return {
          status_code: 400,
          message: "No authorization code received",
          error: null,
          data: null,
        };
      }

      const pluginOAuth2Config = driveDB
        .prepare("SELECT * FROM oauth WHERE plugin_id = ?")
        .get(GoogleDrivePlugin.id) as GoogleDriveOAuthModel | undefined;

      if (!pluginOAuth2Config) {
        return {
          status_code: 404,
          message: "Plugin OAuth not configured",
          error: null,
          data: null,
        };
      }

      const { client_id, client_secret } = pluginOAuth2Config;

      if (!client_id || !client_secret) {
        return {
          status_code: 400,
          message: "Plugin OAuth not configured",
          error: "Missing client_id or client_secret",
          data: null,
        };
      }

      const redirectUri =
        "http://localhost:8032/plugins/google-drive/oauth2/callback";

      const oauth2Client = new google.auth.OAuth2({
        client_id,
        client_secret,
        redirectUri,
      });

      try {
        const { tokens } = await oauth2Client.getToken(query.code);

        console.log(tokens);

        const mergedRow = {
          ...pluginOAuth2Config,
          ...tokens,
        };

        driveDB
          .prepare(
            "UPDATE oauth SET access_token = ?, refresh_token = ?, scope = ?, token_type = ?, refresh_token_expires_in = ?, expiry_date = ? WHERE plugin_id = ?",
          )
          .run(
            mergedRow.access_token,
            mergedRow.refresh_token,
            mergedRow.scope,
            mergedRow.token_type,
            mergedRow.refresh_token_expires_in,
            mergedRow.expiry_date,
            GoogleDrivePlugin.id,
          );

        return {
          status_code: 200,
          message: "OAuth2 tokens saved successfully",
          error: null,
          data: null,
        };
      } catch (err: any) {
        return {
          status_code: 500,
          message: "Failed to connect to Google Drive",
          error: err.message,
          data: null,
        };
      }
    },
  );
}
