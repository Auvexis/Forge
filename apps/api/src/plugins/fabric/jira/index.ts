import type { ApiKeyProvider, PluginManifest, FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createJiraMethods } from "./methods.ts";

const auth: ApiKeyProvider = {
  type: "api_key",

  credentialSchema: {
    base_url: { type: "string", inputType: "text", label: "Base URL", required: true, placeholder: "https://your-domain.atlassian.net" },
    email: { type: "string", inputType: "text", label: "Email", required: true },
    api_token: { type: "string", inputType: "password", label: "API Token", required: true },
  },

  async testConnection(credentials) {
    const baseUrl = credentials.base_url?.trim()?.replace(/\/+$/, "");
    const email = credentials.email?.trim();
    const apiToken = credentials.api_token?.trim();
    if (!baseUrl || !email || !apiToken) throw new Error("Jira base URL, email, and API token are required.");

    const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}` },
    });
    if (!response.ok) throw new Error(`Invalid Jira credentials: ${response.status} ${response.statusText}`);
    return true;
  },
};

const JiraPlugin: FabricPlugin = {
  id: "jira",
  manifest: manifest as PluginManifest,
  auth,
  methods: createJiraMethods(),
};

export default JiraPlugin;
