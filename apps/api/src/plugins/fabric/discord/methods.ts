import type { PluginContext } from "@auvexis/fabric-sdk";

const DISCORD_API_BASE = "https://discord.com/api/v10";

type JsonBody = Record<string, any> | undefined;

function required(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`'${fieldName}' is required.`);
  return trimmed;
}

function optionalNumber(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 1) throw new Error("'limit' must be a positive number.");
  return Math.min(Math.floor(value), 100);
}

export async function discordApi(
  context: PluginContext,
  method: string,
  path: string,
  body?: JsonBody,
): Promise<any> {
  const token = context.credentials?.bot_token?.trim();
  if (!token) {
    throw new Error("Discord bot token is not configured. Go to Settings > Plugins > Discord and enter your Bot Token.");
  }

  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message ?? (text || "Unknown error");
    const code = data?.code ? ` (code: ${data.code})` : "";
    throw new Error(`Discord API error on '${path}': ${message}${code}`);
  }

  return data ?? { ok: true };
}

export function createDiscordMethods() {
  return {
    sendMessage: async (
      params: { channelId: string; content: string; tts?: boolean },
      context?: PluginContext,
    ) => {
      const channelId = required(params.channelId, "channelId");
      const content = required(params.content, "content");

      return discordApi(context!, "POST", `/channels/${channelId}/messages`, {
        content,
        ...(params.tts ? { tts: true } : {}),
      });
    },

    editMessage: async (
      params: { channelId: string; messageId: string; content: string },
      context?: PluginContext,
    ) => {
      const channelId = required(params.channelId, "channelId");
      const messageId = required(params.messageId, "messageId");
      const content = required(params.content, "content");

      return discordApi(context!, "PATCH", `/channels/${channelId}/messages/${messageId}`, { content });
    },

    deleteMessage: async (
      params: { channelId: string; messageId: string; confirm?: boolean },
      context?: PluginContext,
    ) => {
      if (params.confirm !== true) {
        throw new Error("'confirm' must be true before deleting a Discord message.");
      }

      const channelId = required(params.channelId, "channelId");
      const messageId = required(params.messageId, "messageId");

      return discordApi(context!, "DELETE", `/channels/${channelId}/messages/${messageId}`);
    },

    getMessage: async (
      params: { channelId: string; messageId: string },
      context?: PluginContext,
    ) => {
      const channelId = required(params.channelId, "channelId");
      const messageId = required(params.messageId, "messageId");

      return discordApi(context!, "GET", `/channels/${channelId}/messages/${messageId}`);
    },

    listChannelMessages: async (
      params: { channelId: string; limit?: number; before?: string; after?: string; around?: string },
      context?: PluginContext,
    ) => {
      const channelId = required(params.channelId, "channelId");
      const searchParams = new URLSearchParams({ limit: String(optionalNumber(params.limit, 50)) });

      if (params.before?.trim()) searchParams.set("before", params.before.trim());
      if (params.after?.trim()) searchParams.set("after", params.after.trim());
      if (params.around?.trim()) searchParams.set("around", params.around.trim());

      return discordApi(context!, "GET", `/channels/${channelId}/messages?${searchParams.toString()}`);
    },

    createThread: async (
      params: {
        channelId: string;
        name: string;
        messageId?: string;
        autoArchiveDuration?: number;
        type?: number;
        invitable?: boolean;
      },
      context?: PluginContext,
    ) => {
      const channelId = required(params.channelId, "channelId");
      const name = required(params.name, "name");
      const body = {
        name,
        ...(params.autoArchiveDuration ? { auto_archive_duration: params.autoArchiveDuration } : {}),
        ...(params.type ? { type: params.type } : {}),
        ...(params.invitable !== undefined ? { invitable: params.invitable } : {}),
      };

      if (params.messageId?.trim()) {
        return discordApi(context!, "POST", `/channels/${channelId}/messages/${params.messageId.trim()}/threads`, body);
      }

      return discordApi(context!, "POST", `/channels/${channelId}/threads`, body);
    },

    addReaction: async (
      params: { channelId: string; messageId: string; emoji: string },
      context?: PluginContext,
    ) => {
      const channelId = required(params.channelId, "channelId");
      const messageId = required(params.messageId, "messageId");
      const emoji = encodeURIComponent(required(params.emoji, "emoji"));

      return discordApi(context!, "PUT", `/channels/${channelId}/messages/${messageId}/reactions/${emoji}/@me`);
    },

    getGuildMember: async (
      params: { guildId: string; userId: string },
      context?: PluginContext,
    ) => {
      const guildId = required(params.guildId, "guildId");
      const userId = required(params.userId, "userId");

      return discordApi(context!, "GET", `/guilds/${guildId}/members/${userId}`);
    },
  };
}
