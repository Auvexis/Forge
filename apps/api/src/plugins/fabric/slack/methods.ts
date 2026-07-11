import type { PluginContext } from "@auvexis/fabric-sdk";

const SLACK_API_BASE = "https://slack.com/api";

type SlackBody = Record<string, any> | undefined;

function required(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`'${fieldName}' is required.`);
  return trimmed;
}

function optionalNumber(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 1) throw new Error("'limit' must be a positive number.");
  return Math.min(Math.floor(value), 1000);
}

function parseUsers(users: string | string[]): string[] {
  if (Array.isArray(users)) return users.map((user) => user.trim()).filter(Boolean);
  return users.split(",").map((user) => user.trim()).filter(Boolean);
}

export async function slackApi(
  context: PluginContext,
  endpoint: string,
  body?: SlackBody,
): Promise<any> {
  const token = context.credentials?.bot_token?.trim();
  if (!token) {
    throw new Error("Slack bot token is not configured. Go to Settings > Plugins > Slack and enter your Bot Token.");
  }

  const response = await fetch(`${SLACK_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body ?? {}),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`Slack API error on '${endpoint}': ${data.error ?? (text || response.statusText)}`);
  }

  if (data.ok !== true) {
    throw new Error(`Slack API error on '${endpoint}': ${data.error ?? "Unknown error"}`);
  }

  return data;
}

async function uploadContent(uploadUrl: string, contentBase64: string): Promise<void> {
  const content = Buffer.from(contentBase64, "base64");
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: content,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Slack file upload failed: ${text || response.statusText}`);
  }
}

export function createSlackMethods() {
  return {
    postMessage: async (
      params: { channel: string; text: string; threadTs?: string },
      context?: PluginContext,
    ) => {
      const body = {
        channel: required(params.channel, "channel"),
        text: required(params.text, "text"),
        ...(params.threadTs?.trim() ? { thread_ts: params.threadTs.trim() } : {}),
      };

      return slackApi(context!, "chat.postMessage", body);
    },

    updateMessage: async (
      params: { channel: string; ts: string; text: string },
      context?: PluginContext,
    ) => {
      return slackApi(context!, "chat.update", {
        channel: required(params.channel, "channel"),
        ts: required(params.ts, "ts"),
        text: required(params.text, "text"),
      });
    },

    deleteMessage: async (
      params: { channel: string; ts: string; confirm?: boolean },
      context?: PluginContext,
    ) => {
      if (params.confirm !== true) {
        throw new Error("'confirm' must be true before deleting a Slack message.");
      }

      return slackApi(context!, "chat.delete", {
        channel: required(params.channel, "channel"),
        ts: required(params.ts, "ts"),
      });
    },

    listChannels: async (
      params: { types?: string; limit?: number; cursor?: string } = {},
      context?: PluginContext,
    ) => {
      return slackApi(context!, "conversations.list", {
        types: params.types?.trim() || "public_channel,private_channel",
        limit: optionalNumber(params.limit, 200),
        ...(params.cursor?.trim() ? { cursor: params.cursor.trim() } : {}),
      });
    },

    getChannelHistory: async (
      params: { channel: string; limit?: number; oldest?: string; latest?: string },
      context?: PluginContext,
    ) => {
      return slackApi(context!, "conversations.history", {
        channel: required(params.channel, "channel"),
        limit: optionalNumber(params.limit, 100),
        ...(params.oldest?.trim() ? { oldest: params.oldest.trim() } : {}),
        ...(params.latest?.trim() ? { latest: params.latest.trim() } : {}),
      });
    },

    addReaction: async (
      params: { channel: string; ts: string; emoji: string },
      context?: PluginContext,
    ) => {
      return slackApi(context!, "reactions.add", {
        channel: required(params.channel, "channel"),
        timestamp: required(params.ts, "ts"),
        name: required(params.emoji, "emoji").replace(/^:/, "").replace(/:$/, ""),
      });
    },

    openConversation: async (
      params: { users: string | string[]; returnIm?: boolean },
      context?: PluginContext,
    ) => {
      const users = parseUsers(params.users);
      if (users.length === 0) throw new Error("'users' is required.");

      return slackApi(context!, "conversations.open", {
        users: users.join(","),
        ...(params.returnIm !== undefined ? { return_im: params.returnIm } : {}),
      });
    },

    uploadFile: async (
      params: {
        channel: string;
        filename: string;
        contentBase64: string;
        title?: string;
        initialComment?: string;
      },
      context?: PluginContext,
    ) => {
      const channel = required(params.channel, "channel");
      const filename = required(params.filename, "filename");
      const contentBase64 = required(params.contentBase64, "contentBase64");
      const length = Buffer.from(contentBase64, "base64").byteLength;

      const upload = await slackApi(context!, "files.getUploadURLExternal", {
        filename,
        length,
      });

      await uploadContent(upload.upload_url, contentBase64);

      return slackApi(context!, "files.completeUploadExternal", {
        channel_id: channel,
        files: [
          {
            id: upload.file_id,
            title: params.title?.trim() || filename,
          },
        ],
        ...(params.initialComment?.trim() ? { initial_comment: params.initialComment.trim() } : {}),
      });
    },
  };
}
