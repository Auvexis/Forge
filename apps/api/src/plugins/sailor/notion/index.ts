import type { ApiKeyProvider, PluginManifest, SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createNotionMethods } from "./methods.ts";

const auth: ApiKeyProvider = {
  type: "api_key",

  credentialSchema: {
    integration_token: {
      type: "string",
      inputType: "password",
      label: "Integration Token",
      description: "Internal integration token from Notion.",
      required: true,
      placeholder: "secret_...",
    },
  },

  async testConnection(credentials) {
    const token = credentials.integration_token?.trim();
    if (!token) throw new Error("Notion integration token is missing or empty.");

    const response = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!response.ok) {
      throw new Error(`Invalid Notion integration token: ${response.status} ${response.statusText}`);
    }

    return true;
  },
};

const NotionPlugin: SailorPlugin = {
  id: "notion",
  manifest: manifest as PluginManifest,
  auth,
  methods: createNotionMethods(),
};

export default NotionPlugin;
