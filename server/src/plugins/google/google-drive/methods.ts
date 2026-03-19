import { google } from "googleapis";
import GoogleDrivePlugin from "./index.ts";
import type { GoogleDriveOAuthModel } from "./models/plugin.model.ts";
import { driveDB } from "./database.ts";
import { Readable } from "stream";

export const GoogleDrivePluginMethods = {
  /**
   * DRIVE API CLIENT
   */
  getDriveClient: async () => {
    const pluginOAuthConfig = driveDB
      .prepare("SELECT * FROM oauth WHERE plugin_id = ?")
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
          UPDATE oauth 
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
          UPDATE oauth 
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
  listFiles: async (params: { pageSize?: number; query?: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const response = await driveClient.files.list({
      fields: "files(id, name, mimeType, size, modifiedTime, parents, trashed)",
      pageSize: params.pageSize || 30,
      q: params.query,
    });

    return response.data.files;
  },
  getFileMetadata: async (params: { fileId: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const response = await driveClient.files.get({
      fields: "id, name, mimeType, size, modifiedTime, parents, trashed",
      fileId: params.fileId,
    });

    return response.data;
  },
  listFolderChildren: async (params: { folderId: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const response = await driveClient.files.list({
      fields: "files(id, name, mimeType, size, modifiedTime, parents, trashed)",
      q: `'${params.folderId}' in parents`,
    });

    return response.data.files;
  },

  /**
   * File methods
   */
  uploadFile: async (params: {
    name: string;
    contentBase64: string;
    parentId?: string;
    mimeType?: string;
  }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const buffer = Buffer.from(params.contentBase64, "base64");
    const stream = Readable.from(buffer);

    const response = await driveClient.files.create({
      requestBody: {
        name: params.name,
        mimeType: params.mimeType || "application/octet-stream",
        ...(params.parentId && {
          parents: [params.parentId],
        }),
      },
      media: {
        mimeType: params.mimeType || "application/octet-stream",
        body: stream,
      },
      fields: "id, name, mimeType, size, parents",
    });

    return response.data;
  },
  downloadFile: async (params: { fileId: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    /**
     * Get file metadata
     */
    const metadata = await driveClient.files.get({
      fileId: params.fileId,
      fields: "name, mimeType",
    });

    /**
     * Download file
     */
    const response = await driveClient.files.get(
      {
        fileId: params.fileId,
        alt: "media",
      },
      { responseType: "stream" },
    );

    const chunks: Buffer[] = [];

    for await (const chunk of response.data) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    return {
      name: metadata.data.name,
      mimeType: metadata.data.mimeType,
      base64: buffer.toString("base64"),
    };
  },
  deleteFile: async (params: { fileId: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const file = await driveClient.files.get({
      fileId: params.fileId,
      fields: "id, name, mimeType, size, modifiedTime, parents, trashed",
    });

    if (file.data.trashed) {
      throw new Error("File already deleted");
    }

    await driveClient.files.update({
      fileId: params.fileId,
      requestBody: {
        trashed: true,
      },
    });

    return {
      ...file.data,
      trashed: true,
    };
  },

  /**
   * Folder methods
   */
  createFolder: async (params: { name: string; parentId?: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const response = await driveClient.files.create({
      requestBody: {
        name: params.name,
        mimeType: "application/vnd.google-apps.folder",
        ...(params.parentId && {
          parents: [params.parentId],
        }),
      },
      fields: "id, name, mimeType, parents",
    });

    return response.data;
  },
  deleteFolder: async (params: { folderId: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const file = await driveClient.files.get({
      fileId: params.folderId,
      fields: "id, name, mimeType, size, modifiedTime, parents, trashed",
    });

    if (file.data.trashed) {
      throw new Error("Folder already deleted");
    }

    await driveClient.files.update({
      fileId: params.folderId,
      requestBody: {
        trashed: true,
      },
    });

    return {
      ...file.data,
      trashed: true,
    };
  },

  /**
   * Move file
   */
  moveFile: async (params: { fileId: string; parentId: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const file = await driveClient.files.get({
      fileId: params.fileId,
      fields: "id, name, mimeType, size, modifiedTime, parents, trashed",
    });

    await driveClient.files.update({
      fileId: params.fileId,
      addParents: params.parentId,
      removeParents: file.data.parents?.join(","),
    });

    return {
      ...file.data,
      parents: [params.parentId],
    };
  },

  /**
   * Copy file
   */
  copyFile: async (params: { fileId: string; parentId: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const file = await driveClient.files.get({
      fileId: params.fileId,
      fields: "id, name, mimeType, size, modifiedTime, parents, trashed",
    });

    const response = await driveClient.files.copy({
      fileId: params.fileId,
      requestBody: {
        parents: [params.parentId],
      },
    });

    return {
      ...file.data,
      parents: [params.parentId],
    };
  },

  /**
   * Restore file
   */
  restoreFile: async (params: { fileId: string }) => {
    const driveClient = await GoogleDrivePluginMethods.getDriveClient();

    const file = await driveClient.files.get({
      fileId: params.fileId,
      fields: "id, name, mimeType, size, modifiedTime, parents, trashed",
    });

    if (!file.data.trashed) {
      throw new Error("File is not deleted");
    }

    await driveClient.files.update({
      fileId: params.fileId,
      requestBody: {
        trashed: false,
      },
    });

    return {
      ...file.data,
      trashed: false,
    };
  },
};
