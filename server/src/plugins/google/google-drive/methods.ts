import { google } from "googleapis";
import GoogleDrivePlugin from "./index.ts";
import type { GoogleDriveOAuthModel } from "./models/plugin.model.ts";
import { driveDB } from "./database.ts";

export const GoogleDrivePluginMethods = {
  /**
   * DRIVE API
   */
  getDriveClient: async () => {
    const pluginOAuthConfig = driveDB
      .prepare("SELECT * FROM plugin_google_drive_oauth WHERE plugin_id = ?")
      .get(GoogleDrivePlugin.id) as GoogleDriveOAuthModel | undefined;

    if (!pluginOAuthConfig) throw new Error("Plugin not authorized");

    const { client_id, client_secret, access_token, refresh_token } =
      pluginOAuthConfig;

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);

    oauth2Client.setCredentials({
      access_token,
      refresh_token,
    });

    oauth2Client.on("tokens", (tokens) => {
      if (tokens.access_token) {
        driveDB
          .prepare(
            `
          UPDATE plugin_google_drive_oauth 
          SET access_token = ?, expiry_date = ?
          WHERE plugin_id = ?
        `,
          )
          .run(tokens.access_token, tokens.expiry_date, GoogleDrivePlugin.id);
      }

      if (tokens.refresh_token) {
        driveDB
          .prepare(
            `
          UPDATE plugin_google_drive_oauth 
          SET refresh_token = ?
          WHERE plugin_id = ?
        `,
          )
          .run(tokens.refresh_token, GoogleDrivePlugin.id);
      }
    });

    return google.drive({ version: "v3", auth: oauth2Client });
  },

  /**
   * Get methods
   */
  listFiles: async (params: {
    folderId?: string;
    pageSize?: number;
    query?: string;
  }) => {},
  searchFiles: async (params: { query: string }) => {},
  getFileMetadata: async (params: { fileId: string }) => {},

  /**
   * File methods
   */
  uploadFile: async (params: {
    name: string;
    content: string;
    folderId?: string;
    mimeType?: string;
  }) => {},
  downloadFile: async (params: { fileId: string }) => {},
  deleteFile: async (params: { fileId: string }) => {},

  /**
   * Folder methods
   */
  createFolder: async (params: { name: string; parentId?: string }) => {},
  deleteFolder: async (params: { folderId: string }) => {},
  downloadFolder: async (params: { folderId: string }) => {},
};
