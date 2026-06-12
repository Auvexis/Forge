import type { ApiKeyProvider, PluginManifest, SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createSlackMethods } from "./methods.ts";
import { createNoopWebhookTrigger } from "./triggers.ts";

const auth: ApiKeyProvider = {
  type: "api_key",

  credentialSchema: {
    bot_token: {
      type: "string",
      inputType: "password",
      label: "Bot Token",
      description: "Slack bot token, usually starting with xoxb-.",
      required: true,
      placeholder: "xoxb-...",
    },
  },

  async testConnection(credentials) {
    const token = credentials.bot_token?.trim();
    if (!token) throw new Error("Slack bot token is missing or empty.");

    const response = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: "{}",
    });
    const data = await response.json() as { ok?: boolean; error?: string };

    if (data.ok !== true) {
      throw new Error(`Invalid Slack bot token: ${data.error ?? response.statusText}`);
    }

    return true;
  },
};

const SlackPlugin: SailorPlugin = {
  id: "slack",
  manifest: manifest as PluginManifest,
  auth,
  methods: createSlackMethods(),
  triggers: {
    onMessage: createNoopWebhookTrigger(),
    onMention: createNoopWebhookTrigger(),
    onAppHomeOpened: createNoopWebhookTrigger(),
  },
};

export default SlackPlugin;
