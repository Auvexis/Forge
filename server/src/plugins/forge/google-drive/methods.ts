import { google } from "googleapis";
import type { PluginContext } from "../../../shared/models/plugin-types.ts";
import { Readable } from "stream";

/**
 * Creates a Drive API client from the plugin context (injected by core)
 */
function getDriveClient(context: PluginContext) {
  if (!context.tokens?.access_token) {
    throw new Error("Plugin not authorized — missing access token");
  }

  const oauth2Client = new google.auth.OAuth2(
    context.credentials.client_id,
    context.credentials.client_secret,
  );

  oauth2Client.setCredentials({
    access_token: context.tokens.access_token,
    refresh_token: context.tokens.refresh_token,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export function createGoogleDriveMethods() {
  return {
    listFiles: async (
      params: { pageSize?: number; query?: string },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
        const response = await driveClient.files.list({
          fields:
            "files(id, name, mimeType, size, modifiedTime, parents, trashed)",
          pageSize: params.pageSize || 30,
          q: params.query,
        });

        return response.data.files;
      } catch (error) {
        throw error;
      }
    },

    getFileMetadata: async (
      params: { fileId: string },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
        const response = await driveClient.files.get({
          fields: "id, name, mimeType, size, modifiedTime, parents, trashed",
          fileId: params.fileId,
        });

        return response.data;
      } catch (error) {
        throw error;
      }
    },

    listFolderChildren: async (
      params: { folderId: string },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
        const response = await driveClient.files.list({
          fields:
            "files(id, name, mimeType, size, modifiedTime, parents, trashed)",
          q: `'${params.folderId}' in parents`,
        });

        return response.data.files;
      } catch (error) {
        throw error;
      }
    },

    uploadFile: async (
      params: {
        name: string;
        contentBase64: string;
        parentId?: string;
        mimeType?: string;
      },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
        // Clean whitespace/newlines from base64 string
        const cleanBase64 = params.contentBase64.replace(/\s/g, "");
        const buffer = Buffer.from(cleanBase64, "base64");
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
          fields: "id, name, mimeType, size, parents, trashed",
        });

        return response.data;
      } catch (error) {
        throw error;
      }
    },

    downloadFile: async (
      params: { fileId: string },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
        const metadata = await driveClient.files.get({
          fileId: params.fileId,
          fields: "name, mimeType",
        });

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
          download: {
            fileName: metadata.data.name,
            mimeType: metadata.data.mimeType,
            base64: buffer.toString("base64"),
          },
        };
      } catch (error) {
        throw error;
      }
    },

    deleteFile: async (params: { fileId: string }, context?: PluginContext) => {
      const driveClient = getDriveClient(context!);

      try {
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
      } catch (error) {
        throw error;
      }
    },

    createFolder: async (
      params: { name: string; parentId?: string },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
        const response = await driveClient.files.create({
          requestBody: {
            name: params.name,
            mimeType: "application/vnd.google-apps.folder",
            ...(params.parentId && {
              parents: [params.parentId],
            }),
          },
          fields: "id, name, mimeType, parents, trashed",
        });

        return response.data;
      } catch (error) {
        throw error;
      }
    },

    deleteFolder: async (
      params: { folderId: string },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
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
      } catch (error) {
        throw error;
      }
    },

    moveFile: async (
      params: { fileId: string; parentId: string },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
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
      } catch (error) {
        throw error;
      }
    },

    copyFile: async (
      params: { fileId: string; parentId: string },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
        const file = await driveClient.files.get({
          fileId: params.fileId,
          fields: "id, name, mimeType, size, modifiedTime, parents, trashed",
        });

        await driveClient.files.copy({
          fileId: params.fileId,
          requestBody: {
            parents: [params.parentId],
          },
        });

        return {
          ...file.data,
          parents: [params.parentId],
        };
      } catch (error) {
        throw error;
      }
    },

    restoreFile: async (
      params: { fileId: string },
      context?: PluginContext,
    ) => {
      const driveClient = getDriveClient(context!);

      try {
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
      } catch (error) {
        throw error;
      }
    },
  };
}
