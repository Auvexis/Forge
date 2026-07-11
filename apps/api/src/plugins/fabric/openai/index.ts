import type { ApiKeyProvider, PluginManifest, FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createOpenAiMethods } from "./methods.ts";

const auth: ApiKeyProvider = {
  type: "api_key",

  credentialSchema: {
    api_key: { type: "string", inputType: "password", label: "API Key", required: true, placeholder: "sk-..." },
  },

  async testConnection(credentials) {
    const apiKey = credentials.api_key?.trim();
    if (!apiKey) throw new Error("OpenAI API key is missing or empty.");
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`Invalid OpenAI API key: ${response.status} ${response.statusText}`);
    return true;
  },
};

const OpenAiPlugin: FabricPlugin = {
  id: "openai",
  manifest: manifest as PluginManifest,
  auth,
  methods: createOpenAiMethods(),
};

export default OpenAiPlugin;
