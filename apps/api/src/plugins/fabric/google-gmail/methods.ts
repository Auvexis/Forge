import { google } from "googleapis";
import type { PluginContext } from "@auvexis/fabric-sdk";

// ──────────── Constants ────────────

/** RFC 5321 max line length for headers */
const HEADER_MAX_LENGTH = 998;

/** Simple but effective email address pattern (RFC 5322 simplified) */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ──────────── Auth Helper ────────────

/**
 * Creates a Gmail API client from the plugin context (injected by core).
 * Throws a descriptive error if the plugin has not been authorized.
 */
function getGmailClient(context: PluginContext) {
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

  return google.gmail({ version: "v1", auth: oauth2Client });
}

// ──────────── Header Sanitization Helpers ────────────

/**
 * Strips all control characters (including CR, LF, TAB, NUL) from a string
 * and trims whitespace. This is the primary defense against header injection.
 * The Gmail API will return 400 Bad Request if a header contains line breaks.
 */
function sanitizeHeader(value: string): string {
  if (!value) return "";
  // Remove control characters: U+0000–U+001F and U+007F (DEL)
  // This covers \r (U+000D), \n (U+000A), \t (U+0009), and all others.
  const cleaned = value.replace(/[\x00-\x1F\x7F]/g, " ").trim();
  // Truncate to prevent absurdly long headers
  return cleaned.slice(0, HEADER_MAX_LENGTH);
}

/**
 * Extracts and validates email address(es) from a string.
 * Accepts formats: "user@example.com" or "Display Name <user@example.com>".
 * Throws a descriptive error for invalid addresses.
 *
 * @param value - Raw email string (may contain display name)
 * @param fieldName - Used in error messages ("To", "From", etc.)
 */
function sanitizeEmailHeader(value: string, fieldName: string): string {
  if (!value) return "";
  const clean = sanitizeHeader(value);

  // Extract the actual email address from "Display Name <email>" format
  const angleMatch = clean.match(/<([^>]+)>/);
  const emailAddress = angleMatch ? angleMatch[1].trim() : clean;

  if (!EMAIL_REGEX.test(emailAddress)) {
    throw new Error(
      `Invalid email address in '${fieldName}': "${emailAddress}". Expected format: "user@example.com" or "Name <user@example.com>".`
    );
  }

  return clean;
}

// ──────────── MIME Builder ────────────

interface MimeMessageParams {
  to: string;
  from?: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    contentBase64: string;
  }>;
}

interface GmailAttachment {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

/**
 * Builds a RFC 2822-compliant MIME email message string.
 *
 * Design principles:
 * - Sanitizes all headers to prevent header injection attacks.
 * - Encodes the Subject using RFC 2047 Base64 encoding (utf-8 charset).
 * - Detects HTML body and sets the appropriate Content-Type.
 * - Handles multipart/mixed for attachments.
 * - DRY: shared by sendMessage and createDraft.
 */
function buildMimeMessage(params: MimeMessageParams): string {
  const cleanTo = sanitizeEmailHeader(params.to, "To");
  const cleanFrom = params.from ? sanitizeEmailHeader(params.from, "From") : null;
  // RFC 2047 Base64-encoded subject for full Unicode support
  const utf8Subject = `=?utf-8?B?${Buffer.from(sanitizeHeader(params.subject)).toString("base64")}?=`;

  // Detect HTML body — if it contains any HTML tags, send as text/html
  const isHtml = /<[a-z][\s\S]*>/i.test(params.body);
  const bodyContentType = isHtml ? "text/html" : "text/plain";

  const hasAttachments = params.attachments && params.attachments.length > 0;

  if (hasAttachments) {
    const boundary = `----=_FabricPart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const parts: string[] = [
      `To: ${cleanTo}`,
      ...(cleanFrom ? [`From: ${cleanFrom}`] : []),
      `Subject: ${utf8Subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      `Content-Type: ${bodyContentType}; charset=utf-8`,
      "Content-Transfer-Encoding: quoted-printable",
      "",
      params.body,
      "",
    ];

    for (const att of params.attachments!) {
      // Sanitize filename to prevent header injection in Content-Disposition
      const safeFilename = sanitizeHeader(att.filename).replace(/"/g, "'");
      parts.push(
        `--${boundary}`,
        `Content-Type: ${sanitizeHeader(att.mimeType)}; name="${safeFilename}"`,
        `Content-Disposition: attachment; filename="${safeFilename}"`,
        "Content-Transfer-Encoding: base64",
        "",
        // Chunk base64 to 76 chars per line as per RFC 2045
        att.contentBase64.replace(/(.{76})/g, "$1\r\n").trim(),
        "",
      );
    }

    parts.push(`--${boundary}--`);
    return parts.join("\r\n");
  }

  // Simple message without attachments
  return [
    `To: ${cleanTo}`,
    ...(cleanFrom ? [`From: ${cleanFrom}`] : []),
    "MIME-Version: 1.0",
    `Subject: ${utf8Subject}`,
    `Content-Type: ${bodyContentType}; charset=utf-8`,
    "",
    params.body,
  ].join("\r\n");
}

/**
 * Encodes a raw MIME message string to base64url format required by the Gmail API.
 * RFC 4648 §5: uses URL-safe alphabet (- and _) with no padding.
 */
function encodeMessageToBase64Url(message: string): string {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ──────────── Methods ────────────

export function createGoogleGmailMethods() {
  return {
    listMessages: async (
      params: { query?: string; maxResults?: number; labelIds?: string },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      const requestParams: any = {
        userId: "me",
        maxResults: Math.min(params.maxResults || 100, 500), // Gmail API max is 500
      };

      if (params.query) {
        requestParams.q = params.query.trim();
      }

      if (params.labelIds) {
        requestParams.labelIds = params.labelIds.split(",").map((l) => l.trim()).filter(Boolean);
      }

      const response = await gmail.users.messages.list(requestParams);
      return response.data.messages || [];
    },

    getMessage: async (
      params: { messageId: string; format?: "full" | "metadata" | "minimal" | "raw" },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      if (!params.messageId?.trim()) {
        throw new Error("'messageId' is required and cannot be empty.");
      }

      const response = await gmail.users.messages.get({
        userId: "me",
        id: params.messageId.trim(),
        format: params.format || "full",
      });
      return response.data;
    },

    sendMessage: async (
      params: {
        from?: string;
        to: string;
        subject: string;
        body: string;
        attachments?: any[];
      },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      const normalizedAttachments = await normalizeGmailAttachments(params.attachments);

      const message = buildMimeMessage({
        to: params.to,
        from: params.from,
        subject: params.subject,
        body: params.body,
        attachments: normalizedAttachments,
      });

      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodeMessageToBase64Url(message),
        },
      });

      return response.data;
    },

    listLabels: async (
      params: Record<string, never>,
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);
      const response = await gmail.users.labels.list({ userId: "me" });
      return response.data.labels || [];
    },

    modifyMessageLabels: async (
      params: { messageId: string; addLabelIds?: string; removeLabelIds?: string },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      if (!params.messageId?.trim()) {
        throw new Error("'messageId' is required and cannot be empty.");
      }

      const addLabels = params.addLabelIds
        ? params.addLabelIds.split(",").map((l) => l.trim()).filter(Boolean)
        : [];
      const removeLabels = params.removeLabelIds
        ? params.removeLabelIds.split(",").map((l) => l.trim()).filter(Boolean)
        : [];

      const response = await gmail.users.messages.modify({
        userId: "me",
        id: params.messageId.trim(),
        requestBody: {
          addLabelIds: addLabels,
          removeLabelIds: removeLabels,
        },
      });
      return response.data;
    },

    listDrafts: async (
      params: Record<string, never>,
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);
      const response = await gmail.users.drafts.list({ userId: "me" });
      return response.data.drafts || [];
    },

    createDraft: async (
      params: {
        from?: string;
        to: string;
        subject: string;
        body: string;
        attachments?: any[];
      },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      const normalizedAttachments = await normalizeGmailAttachments(params.attachments);

      const message = buildMimeMessage({
        to: params.to,
        from: params.from,
        subject: params.subject,
        body: params.body,
        attachments: normalizedAttachments,
      });

      const response = await gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw: encodeMessageToBase64Url(message),
          },
        },
      });

      return response.data;
    },

    trashMessage: async (
      params: { messageId: string },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      if (!params.messageId?.trim()) {
        throw new Error("'messageId' is required and cannot be empty.");
      }

      const response = await gmail.users.messages.trash({
        userId: "me",
        id: params.messageId.trim(),
      });
      return response.data;
    },

    listThreads: async (
      params: { query?: string; maxResults?: number },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);
      const requestParams: any = {
        userId: "me",
        maxResults: Math.min(params.maxResults || 100, 500),
      };
      if (params.query) requestParams.q = params.query.trim();

      const response = await gmail.users.threads.list(requestParams);
      return response.data.threads || [];
    },

    getAttachment: async (
      params: { messageId: string; attachmentId: string },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      if (!params.messageId?.trim() || !params.attachmentId?.trim()) {
        throw new Error("'messageId' and 'attachmentId' are required.");
      }

      const message = await gmail.users.messages.get({
        userId: "me",
        id: params.messageId.trim(),
        format: "full",
      });
      const metadata = findAttachmentMetadata(message.data.payload, params.attachmentId.trim());
      const response = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: params.messageId.trim(),
        id: params.attachmentId.trim(),
      });
      const content = Buffer.from(response.data.data ?? "", "base64url");
      return {
        name: metadata?.name || `${params.attachmentId.trim()}.bin`,
        mimeType: metadata?.mimeType || "application/octet-stream",
        size: content.byteLength,
        content,
      };
    },
  };
}

function findAttachmentMetadata(
  part: any,
  attachmentId: string,
): { name: string; mimeType: string } | null {
  if (!part) return null;
  if (part.body?.attachmentId === attachmentId) {
    return {
      name: part.filename?.trim() || `${attachmentId}.bin`,
      mimeType: part.mimeType?.trim() || "application/octet-stream",
    };
  }
  for (const child of part.parts ?? []) {
    const found = findAttachmentMetadata(child, attachmentId);
    if (found) return found;
  }
  return null;
}

export async function normalizeGmailAttachments(attachments?: any[]): Promise<GmailAttachment[] | undefined> {
  if (!attachments?.length) return undefined;

  const normalized = await Promise.all(attachments.map(normalizeGmailAttachment));
  const validAttachments = normalized.filter(Boolean) as GmailAttachment[];
  return validAttachments.length > 0 ? validAttachments : undefined;
}

async function normalizeGmailAttachment(att: any): Promise<GmailAttachment | null> {
  if (!att) return null;
  if (typeof att === "string" && /^\s*\{\{[^{}]+\}\}\s*$/.test(att)) return null;
  const filename = att.name;
  const mimeType = att.mimeType;
  const content = att.content;
  if (!content) {
    throw new Error(`Attachment '${filename ?? "unknown"}' has no canonical content.`);
  }
  const contentBase64 = await attachmentContentToBase64(content);
  if (!contentBase64) {
    throw new Error(`Attachment '${filename}' has empty content.`);
  }

  return { filename, mimeType, contentBase64 };
}

async function attachmentContentToBase64(content: any): Promise<string> {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Buffer.isBuffer(content)) return content.toString("base64");
  return "";
}
