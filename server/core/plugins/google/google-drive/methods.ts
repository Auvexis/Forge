import { google } from "googleapis";
import { db } from "../../../database.ts";
import type { PluginDBRow } from "../../../shared/models/plugin.model.ts";
import { parsePluginDBRow } from "../../../shared/models/plugin.model.ts";
import { GoogleDrivePlugin } from "./index.ts";

export const GoogleDriveMethods = {
  /**
   * DRIVE API
   */
  getDriveClient: async () => {
    const pluginId = GoogleDrivePlugin.id;
    const plugin = db
      .prepare("SELECT * FROM plugins WHERE id = ?")
      .get(pluginId);

    const parsedPlugin = parsePluginDBRow(plugin as PluginDBRow);

    if (!parsedPlugin.config.oauth) throw new Error("Plugin not authorized");

    const { client_id, client_secret, access_token, refresh_token } =
      parsedPlugin.config.oauth;

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
    oauth2Client.setCredentials({ access_token, refresh_token });

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
