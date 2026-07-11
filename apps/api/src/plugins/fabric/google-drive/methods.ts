import { google } from "googleapis";
import type { PluginContext } from "@auvexis/fabric-sdk";
import { Readable } from "stream";

// ──────────── Auth Helper ────────────

/**
 * Creates a Drive API client from the plugin context (injected by core).
 */
function getDriveClient(context: PluginContext) {
  if (!context.tokens?.access_token) {
    throw new Error("Plugin not authorized — missing access token. Connect the plugin via Settings > Plugins first.");
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

// ──────────── File Fields ────────────

/** Standard field list for file objects — consistent across all methods */
const FILE_FIELDS = "id, name, mimeType, size, modifiedTime, parents, trashed";

interface GoogleDriveMethodsOptions {
  driveClient?: any;
}

interface GoogleAppsExportSpec {
  mimeType: string;
  extension: string;
}

const GOOGLE_APPS_EXPORTS: Record<string, GoogleAppsExportSpec> = {
  "application/vnd.google-apps.document": {
    mimeType: "application/pdf",
    extension: ".pdf",
  },
  "application/vnd.google-apps.presentation": {
    mimeType: "application/pdf",
    extension: ".pdf",
  },
  "application/vnd.google-apps.drawing": {
    mimeType: "application/pdf",
    extension: ".pdf",
  },
  "application/vnd.google-apps.spreadsheet": {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
  },
};

// ──────────── Buffer Resolution ────────────

/**
 * Resolves a file's binary content from multiple possible input formats.
 *
 * The Fabric executor supports two pipelines for binary data:
 * 1. **Workflow pipeline:** A previous step returned `{ content: Buffer, mimeType }`.
 *    The executor automatically unwraps this to a raw Buffer when the param is
 *    declared as `x-input-type: "file"`. This is the most common case in automated flows.
 * 2. **Manual UI upload:** The user uploads a file via the form. The executor
 *    receives it as a Buffer directly via multipart parsing.
 * 3. **Legacy / plugin-to-plugin:** A base64 string, typically from Gmail attachments
 *    or external APIs that return base64-encoded content.
 *
 * This helper normalises all three into a Node.js Buffer.
 */
function resolveFileBuffer(content: Buffer | string): Buffer {
  if (Buffer.isBuffer(content)) {
    return content;
  }
  if (typeof content === "string") {
    // Strip whitespace/line-breaks that may appear in base64 strings
    const cleaned = content.replace(/\s/g, "");
    return Buffer.from(cleaned, "base64");
  }
  throw new Error(
    "Invalid file content: expected a Buffer or a base64-encoded string. " +
    "Make sure the previous step outputs a compatible file object."
  );
}

// ──────────── Methods ────────────

export function createGoogleDriveMethods(options: GoogleDriveMethodsOptions = {}) {
  const resolveDriveClient = (context?: PluginContext) => options.driveClient ?? getDriveClient(context!);

  return {
    listFiles: async (
      params: {
        pageSize?: number;
        query?: string;
        orderBy?: string;
        showMimeFilter?: boolean;
        mimeTypeFilter?: string;
      },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      // Build the query string — combining user query and mimeType filter
      const queryParts: string[] = [];

      if (params.query?.trim()) {
        queryParts.push(normalizeDriveListQuery(params.query));
      }

      if (params.showMimeFilter && params.mimeTypeFilter?.trim()) {
        // Sanitize mime type to prevent query injection
        const safeMime = params.mimeTypeFilter.trim().replace(/'/g, "");
        queryParts.push(`mimeType = '${safeMime}'`);
      }

      // Never list trashed files by default
      queryParts.push("trashed = false");

      const response = await driveClient.files.list({
        fields: `files(${FILE_FIELDS})`,
        pageSize: Math.min(params.pageSize || 10, 100),
        q: queryParts.join(" and "),
        orderBy: params.orderBy || "modifiedTime desc",
      });

      return response.data.files || [];
    },

    getFileMetadata: async (
      params: { fileId: string },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      if (!params.fileId?.trim()) {
        throw new Error("'fileId' is required and cannot be empty.");
      }

      const response = await driveClient.files.get({
        fields: FILE_FIELDS,
        fileId: params.fileId.trim(),
      });

      return response.data;
    },

    listFolderChildren: async (
      params: { folderId: string },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      if (!params.folderId?.trim()) {
        throw new Error("'folderId' is required and cannot be empty.");
      }

      const response = await driveClient.files.list({
        fields: `files(${FILE_FIELDS})`,
        q: `'${params.folderId.trim()}' in parents and trashed = false`,
      });

      return response.data.files || [];
    },

    /**
     * Uploads one or more files to Google Drive.
     *
     * The `files` parameter accepts an array of file objects. Each object can
     * provide its binary content via:
     * - `contentBase64`: a base64 string (from UI uploads or external API responses)
     * - `content`: a raw Buffer (from the Fabric workflow pipeline)
     *
     * Both are handled transparently via `resolveFileBuffer()`.
     */
    uploadFile: async (
      params: {
        files: Array<{
          filename: string;
          mimeType: string;
          contentBase64?: string | Buffer;
          content?: Buffer;
        }>;
        parentId?: string;
      },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      if (!params.files || params.files.length === 0) {
        throw new Error("At least one file is required in the 'files' array.");
      }

      const uploadPromises = params.files.map(async (fileObj) => {
        if (!fileObj.filename?.trim()) {
          throw new Error("Each file must have a non-empty 'filename'.");
        }

        // Resolve content — prefer Buffer pipeline, fall back to base64
        const rawContent = fileObj.content ?? fileObj.contentBase64;
        if (!rawContent) {
          throw new Error(
            `File '${fileObj.filename}' has no content. ` +
            "Provide 'content' (Buffer from pipeline) or 'contentBase64' (base64 string)."
          );
        }

        const buffer = resolveFileBuffer(rawContent as Buffer | string);
        const stream = Readable.from(buffer);
        const mimeType = fileObj.mimeType?.trim() || "application/octet-stream";

        const response = await driveClient.files.create({
          requestBody: {
            name: fileObj.filename.trim(),
            mimeType,
            ...(params.parentId?.trim() && { parents: [params.parentId.trim()] }),
          },
          media: {
            mimeType,
            body: stream,
          },
          fields: FILE_FIELDS,
        });

        return response.data;
      });

      return await Promise.all(uploadPromises);
    },

    downloadFile: async (
      params: { fileId: string },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      if (!params.fileId?.trim()) {
        throw new Error("'fileId' is required and cannot be empty.");
      }

      const metadata = await driveClient.files.get({
        fileId: params.fileId.trim(),
        fields: "name, mimeType",
      });

      const exportSpec = googleAppsExportForMime(metadata.data.mimeType);
      if (exportSpec) {
        const response = await driveClient.files.export(
          { fileId: params.fileId.trim(), mimeType: exportSpec.mimeType },
          { responseType: "stream" },
        );

        return {
          download: {
            fileName: ensureFileExtension(metadata.data.name ?? params.fileId.trim(), exportSpec.extension),
            mimeType: exportSpec.mimeType,
            content: response.data,
          },
        };
      }

      const response = await driveClient.files.get(
        { fileId: params.fileId.trim(), alt: "media" },
        { responseType: "stream" },
      );

      return {
        download: {
          fileName: metadata.data.name,
          mimeType: metadata.data.mimeType,
          content: response.data,
        },
      };
    },

    deleteFile: async (params: { fileId: string }, context?: PluginContext) => {
      const driveClient = resolveDriveClient(context);

      if (!params.fileId?.trim()) {
        throw new Error("'fileId' is required and cannot be empty.");
      }

      const file = await driveClient.files.get({
        fileId: params.fileId.trim(),
        fields: FILE_FIELDS,
      });

      if (file.data.trashed) {
        throw new Error(`File '${file.data.name}' is already in the trash.`);
      }

      await driveClient.files.update({
        fileId: params.fileId.trim(),
        requestBody: { trashed: true },
      });

      return { ...file.data, trashed: true };
    },

    createFolder: async (
      params: { name: string; parentId?: string },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      if (!params.name?.trim()) {
        throw new Error("'name' is required and cannot be empty.");
      }

      const response = await driveClient.files.create({
        requestBody: {
          name: params.name.trim(),
          mimeType: "application/vnd.google-apps.folder",
          ...(params.parentId?.trim() && { parents: [params.parentId.trim()] }),
        },
        fields: "id, name, mimeType, parents, trashed",
      });

      return response.data;
    },

    deleteFolder: async (
      params: { folderId: string },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      if (!params.folderId?.trim()) {
        throw new Error("'folderId' is required and cannot be empty.");
      }

      const file = await driveClient.files.get({
        fileId: params.folderId.trim(),
        fields: FILE_FIELDS,
      });

      if (file.data.trashed) {
        throw new Error(`Folder '${file.data.name}' is already in the trash.`);
      }

      await driveClient.files.update({
        fileId: params.folderId.trim(),
        requestBody: { trashed: true },
      });

      return { ...file.data, trashed: true };
    },

    moveFile: async (
      params: { fileId: string; parentId: string },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      if (!params.fileId?.trim() || !params.parentId?.trim()) {
        throw new Error("'fileId' and 'parentId' are both required.");
      }

      const file = await driveClient.files.get({
        fileId: params.fileId.trim(),
        fields: FILE_FIELDS,
      });

      await driveClient.files.update({
        fileId: params.fileId.trim(),
        addParents: params.parentId.trim(),
        removeParents: file.data.parents?.join(","),
      });

      return { ...file.data, parents: [params.parentId.trim()] };
    },

    copyFile: async (
      params: { fileId: string; parentId: string },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      if (!params.fileId?.trim() || !params.parentId?.trim()) {
        throw new Error("'fileId' and 'parentId' are both required.");
      }

      const file = await driveClient.files.get({
        fileId: params.fileId.trim(),
        fields: FILE_FIELDS,
      });

      const copy = await driveClient.files.copy({
        fileId: params.fileId.trim(),
        requestBody: { parents: [params.parentId.trim()] },
        fields: FILE_FIELDS,
      });

      return copy.data;
    },

    restoreFile: async (
      params: { fileId: string },
      context?: PluginContext,
    ) => {
      const driveClient = resolveDriveClient(context);

      if (!params.fileId?.trim()) {
        throw new Error("'fileId' is required and cannot be empty.");
      }

      const file = await driveClient.files.get({
        fileId: params.fileId.trim(),
        fields: FILE_FIELDS,
      });

      if (!file.data.trashed) {
        throw new Error(`File '${file.data.name}' is not in the trash and cannot be restored.`);
      }

      await driveClient.files.update({
        fileId: params.fileId.trim(),
        requestBody: { trashed: false },
      });

      return { ...file.data, trashed: false };
    },
  };
}

export function normalizeDriveListQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "";
  if (looksLikeDriveQuery(trimmed)) return trimmed;

  const terms = trimmed
    .split(/\s+/)
    .map((term) => term.replace(/['\\]/g, "").trim())
    .filter(Boolean)
    .slice(0, 8);

  if (terms.length === 0) return "";
  return terms.map((term) => `name contains '${term}'`).join(" and ");
}

function googleAppsExportForMime(mimeType: unknown): GoogleAppsExportSpec | null {
  return typeof mimeType === "string" ? GOOGLE_APPS_EXPORTS[mimeType] ?? null : null;
}

function ensureFileExtension(fileName: string, extension: string): string {
  const trimmed = fileName.trim() || "download";
  return trimmed.toLowerCase().endsWith(extension.toLowerCase()) ? trimmed : `${trimmed}${extension}`;
}

function looksLikeDriveQuery(query: string): boolean {
  return /\b(name|fullText|mimeType|modifiedTime|createdTime|trashed|parents|starred|sharedWithMe)\b\s*(=|!=|<|>|<=|>=|contains|in|has)/i
    .test(query);
}
