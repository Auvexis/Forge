import type { FastifyInstance } from "fastify";
import type { ApiResponse } from "../../../shared/models/api-response.model.ts";
import { GoogleDrivePlugin } from "./index.ts";
import { db } from "../../../database.ts";
import type {
  PluginDBRow,
  PluginModel,
} from "../../../shared/models/plugin.model.ts";
import { parsePluginDBRow } from "../../../shared/models/plugin.model.ts";
import { google } from "googleapis";
import { PluginManager } from "../../manager.ts";

export default async function googleDrivePluginRoutes(
  fastify: FastifyInstance,
) {
  /**
   * Check plugin status
   */
  fastify.get(
    "/plugins/google-drive/status",
    async (req, res): Promise<ApiResponse<PluginModel>> => {
      const plugin = db
        .prepare("SELECT * FROM plugins WHERE id = ?")
        .get(GoogleDrivePlugin.id);

      if (!plugin) {
        return {
          status_code: 404,
          message: "Plugin not found",
          error: null,
          data: null,
        };
      }

      return {
        status_code: 200,
        message: "Google Drive plugin loaded",
        error: null,
        data: parsePluginDBRow(plugin as PluginDBRow),
      };
    },
  );

  /**
   * OAuth2 Endpoints
   */
  fastify.post(
    "/plugins/google-drive/oauth2/connect",
    async (req, res): Promise<ApiResponse<{ url: string }>> => {
      const pluginId = GoogleDrivePlugin.id;
      const row = db
        .prepare("SELECT * FROM plugins WHERE id = ?")
        .get(pluginId);

      if (!row) {
        return {
          status_code: 404,
          message: "Plugin not found",
          error: null,
          data: null,
        };
      }

      const { client_id, client_secret } = parsePluginDBRow(row as PluginDBRow)
        .config.oauth;

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

      const scopes = [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
      ];

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

      const pluginId = GoogleDrivePlugin.id;
      const plugin = db
        .prepare("SELECT * FROM plugins WHERE id = ?")
        .get(pluginId);

      if (!plugin) {
        return {
          status_code: 404,
          message: "Plugin not found",
          error: null,
          data: null,
        };
      }

      const parsedPlugin = parsePluginDBRow(plugin as PluginDBRow);

      if (
        !parsedPlugin.config.oauth.client_id ||
        !parsedPlugin.config.oauth.client_secret
      ) {
        return {
          status_code: 400,
          message: "Plugin OAuth not configured",
          error: "Missing client_id or client_secret",
          data: null,
        };
      }

      const { client_id, client_secret } = parsedPlugin.config.oauth;
      const redirectUri =
        "http://localhost:8032/plugins/google-drive/oauth2/callback";

      const oauth2Client = new google.auth.OAuth2({
        client_id,
        client_secret,
        redirectUri,
      });

      try {
        const { tokens } = await oauth2Client.getToken(query.code);

        parsedPlugin.config.oauth = { ...parsedPlugin.config.oauth, ...tokens };
        db.prepare("UPDATE plugins SET config = ? WHERE id = ?").run(
          JSON.stringify(parsedPlugin.config),
          pluginId,
        );

        PluginManager.updatePluginConfig(pluginId, parsedPlugin.config);

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
