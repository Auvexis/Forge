import { google } from "googleapis";
import type { PluginContext } from "../../../shared/models/plugin-types.ts";

/**
 * Creates a Gmail API client from the plugin context (injected by core)
 */
function getGmailClient(context: PluginContext) {
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

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export function createGoogleGmailMethods() {
  return {
    listMessages: async (
      params: { query?: string; maxResults?: number; labelIds?: string },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      const requestParams: any = {
        userId: "me",
        maxResults: params.maxResults || 100,
      };

      if (params.query) {
        requestParams.q = params.query;
      }
      
      if (params.labelIds) {
        requestParams.labelIds = params.labelIds.split(",").map((l) => l.trim());
      }

      try {
        const response = await gmail.users.messages.list(requestParams);
        return response.data.messages || [];
      } catch (error) {
        throw error;
      }
    },

    getMessage: async (
      params: { messageId: string; format?: "full" | "metadata" | "minimal" | "raw" },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      try {
        const response = await gmail.users.messages.get({
          userId: "me",
          id: params.messageId,
          format: params.format || "full",
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    sendMessage: async (
      params: { 
        from?: string;
        to: string; 
        subject: string; 
        body: string; 
        attachments?: { filename: string; mimeType: string; contentBase64: string }[] 
      },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      try {
        const utf8Subject = `=?utf-8?B?${Buffer.from(params.subject).toString("base64")}?=`;
        const cleanTo = params.to ? params.to.replace(/[\r\n]+/g, " ").trim() : "";
        const cleanFrom = params.from ? params.from.replace(/[\r\n]+/g, " ").trim() : "";
        
        let messageParts: string[] = [];

        if (params.attachments && params.attachments.length > 0) {
          const boundary = `----=_NextPart_${Date.now()}`;
          messageParts = [
            `To: ${cleanTo}`,
            ...(cleanFrom ? [`From: ${cleanFrom}`] : []),
            `Subject: ${utf8Subject}`,
            "MIME-Version: 1.0",
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            "",
            `--${boundary}`,
            "Content-Type: text/html; charset=utf-8",
            "",
            params.body,
            "",
          ];

          for (const att of params.attachments) {
            messageParts.push(
              `--${boundary}`,
              `Content-Type: ${att.mimeType}; name="${att.filename}"`,
              `Content-Disposition: attachment; filename="${att.filename}"`,
              "Content-Transfer-Encoding: base64",
              "",
              att.contentBase64,
              ""
            );
          }
          messageParts.push(`--${boundary}--`);
        } else {
          messageParts = [
            `To: ${cleanTo}`,
            ...(cleanFrom ? [`From: ${cleanFrom}`] : []),
            "Content-Type: text/html; charset=utf-8",
            "MIME-Version: 1.0",
            `Subject: ${utf8Subject}`,
            "",
            params.body,
          ];
        }

        const message = messageParts.join("\r\n");

        // Base64url encode the message
        const encodedMessage = Buffer.from(message)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const response = await gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: encodedMessage,
          },
        });

        return response.data;
      } catch (error) {
        throw error;
      }
    },

    listLabels: async (
      params: any,
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      try {
        const response = await gmail.users.labels.list({
          userId: "me",
        });
        return response.data.labels || [];
      } catch (error) {
        throw error;
      }
    },

    modifyMessageLabels: async (
      params: { messageId: string; addLabelIds?: string; removeLabelIds?: string },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      const addLabels = params.addLabelIds ? params.addLabelIds.split(",").map((l) => l.trim()) : [];
      const removeLabels = params.removeLabelIds ? params.removeLabelIds.split(",").map((l) => l.trim()) : [];

      try {
        const response = await gmail.users.messages.modify({
          userId: "me",
          id: params.messageId,
          requestBody: {
            addLabelIds: addLabels,
            removeLabelIds: removeLabels,
          },
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    listDrafts: async (
      params: any,
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      try {
        const response = await gmail.users.drafts.list({
          userId: "me",
        });
        return response.data.drafts || [];
      } catch (error) {
        throw error;
      }
    },

    createDraft: async (
      params: { 
        from?: string;
        to: string; 
        subject: string; 
        body: string; 
        attachments?: { filename: string; mimeType: string; contentBase64: string }[] 
      },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      try {
        const utf8Subject = `=?utf-8?B?${Buffer.from(params.subject).toString("base64")}?=`;
        const cleanTo = params.to ? params.to.replace(/[\r\n]+/g, " ").trim() : "";
        const cleanFrom = params.from ? params.from.replace(/[\r\n]+/g, " ").trim() : "";
        
        let messageParts: string[] = [];

        if (params.attachments && params.attachments.length > 0) {
          const boundary = `----=_NextPart_${Date.now()}`;
          messageParts = [
            `To: ${cleanTo}`,
            ...(cleanFrom ? [`From: ${cleanFrom}`] : []),
            `Subject: ${utf8Subject}`,
            "MIME-Version: 1.0",
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            "",
            `--${boundary}`,
            "Content-Type: text/html; charset=utf-8",
            "",
            params.body,
            "",
          ];

          for (const att of params.attachments) {
            messageParts.push(
              `--${boundary}`,
              `Content-Type: ${att.mimeType}; name="${att.filename}"`,
              `Content-Disposition: attachment; filename="${att.filename}"`,
              "Content-Transfer-Encoding: base64",
              "",
              att.contentBase64,
              ""
            );
          }
          messageParts.push(`--${boundary}--`);
        } else {
          messageParts = [
            `To: ${cleanTo}`,
            ...(cleanFrom ? [`From: ${cleanFrom}`] : []),
            "Content-Type: text/html; charset=utf-8",
            "MIME-Version: 1.0",
            `Subject: ${utf8Subject}`,
            "",
            params.body,
          ];
        }

        const message = messageParts.join("\r\n");

        const encodedMessage = Buffer.from(message)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const response = await gmail.users.drafts.create({
          userId: "me",
          requestBody: {
            message: {
              raw: encodedMessage,
            },
          },
        });

        return response.data;
      } catch (error) {
        throw error;
      }
    },

    trashMessage: async (
      params: { messageId: string },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);
      try {
        const response = await gmail.users.messages.trash({
          userId: "me",
          id: params.messageId,
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    listThreads: async (
      params: { query?: string; maxResults?: number },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);
      const requestParams: any = {
        userId: "me",
        maxResults: params.maxResults || 100,
      };
      if (params.query) requestParams.q = params.query;

      try {
        const response = await gmail.users.threads.list(requestParams);
        return response.data.threads || [];
      } catch (error) {
        throw error;
      }
    },

    getAttachment: async (
      params: { messageId: string; attachmentId: string },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);
      try {
        const response = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId: params.messageId,
          id: params.attachmentId,
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },
  };
}
