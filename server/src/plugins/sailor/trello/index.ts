import type { ApiKeyProvider, PluginManifest, SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createTrelloMethods } from "./methods.ts";

const auth: ApiKeyProvider = {
  type: "api_key",

  credentialSchema: {
    api_key: {
      type: "string",
      inputType: "password",
      label: "API Key",
      description: "Trello API key.",
      required: true,
    },
    token: {
      type: "string",
      inputType: "password",
      label: "Token",
      description: "Trello user token.",
      required: true,
    },
  },

  async testConnection(credentials) {
    const apiKey = credentials.api_key?.trim();
    const token = credentials.token?.trim();
    if (!apiKey || !token) throw new Error("Trello API key and token are required.");

    const url = new URL("https://api.trello.com/1/members/me");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("token", token);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Invalid Trello credentials: ${response.status} ${response.statusText}`);
    }

    return true;
  },
};

const TrelloPlugin: SailorPlugin = {
  id: "trello",
  manifest: manifest as PluginManifest,
  auth,
  methods: createTrelloMethods(),
};

export default TrelloPlugin;
