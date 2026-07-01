import type { ApiKeyProvider, PluginManifest, SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createOpenRouterMethods } from "./methods.ts";

const auth: ApiKeyProvider = {
  type: "api_key",

  credentialSchema: {
    api_key: { type: "string", inputType: "password", label: "API Key", required: true },
    http_referer: { type: "string", inputType: "text", label: "HTTP Referer", required: false },
    x_title: { type: "string", inputType: "text", label: "App Title", required: false },
  },

  async testConnection(credentials) {
    const apiKey = credentials.api_key?.trim();
    if (!apiKey) throw new Error("OpenRouter API key is missing or empty.");
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`Invalid OpenRouter API key: ${response.status} ${response.statusText}`);
    return true;
  },
};

const OpenRouterPlugin: SailorPlugin = {
  id: "openrouter",
  manifest: manifest as PluginManifest,
  auth,
  methods: createOpenRouterMethods(),
};

export default OpenRouterPlugin;
