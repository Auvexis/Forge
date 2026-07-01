import type { ApiKeyProvider, PluginManifest, SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createDiscordMethods } from "./methods.ts";
import { createDiscordGatewayTrigger } from "./triggers.ts";

const auth: ApiKeyProvider = {
  type: "api_key",

  credentialSchema: {
    bot_token: {
      type: "string",
      inputType: "password",
      label: "Bot Token",
      description: "Discord bot token from the Developer Portal.",
      required: true,
      placeholder: "Bot token",
    },
  },

  async testConnection(credentials) {
    const token = credentials.bot_token?.trim();
    if (!token) throw new Error("Discord bot token is missing or empty.");

    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Invalid Discord bot token: ${text || response.statusText}`);
    }

    return true;
  },
};

const DiscordPlugin: SailorPlugin = {
  id: "discord",
  manifest: manifest as PluginManifest,
  auth,
  methods: createDiscordMethods(),
  triggers: {
    onMessage: createDiscordGatewayTrigger("onMessage"),
    onSlashCommand: createDiscordGatewayTrigger("onSlashCommand"),
    onReaction: createDiscordGatewayTrigger("onReaction"),
  },
};

export default DiscordPlugin;
