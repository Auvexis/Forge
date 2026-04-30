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
      params: { to: string; subject: string; body: string },
      context?: PluginContext,
    ) => {
      const gmail = getGmailClient(context!);

      try {
        // Construct standard RFC 2822 email
        const utf8Subject = `=?utf-8?B?${Buffer.from(params.subject).toString("base64")}?=`;
        const messageParts = [
          `To: ${params.to}`,
          "Content-Type: text/html; charset=utf-8",
          "MIME-Version: 1.0",
          `Subject: ${utf8Subject}`,
          "",
          params.body,
        ];
        const message = messageParts.join("\n");

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
  };
}
