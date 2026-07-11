import type { ApiKeyProvider, PluginManifest, FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createGitHubMethods } from "./methods.ts";

const auth: ApiKeyProvider = {
  type: "api_key",

  credentialSchema: {
    token: {
      type: "string",
      inputType: "password",
      label: "Token",
      description: "GitHub personal access token or fine-grained token.",
      required: true,
      placeholder: "ghp_...",
    },
  },

  async testConnection(credentials) {
    const token = credentials.token?.trim();
    if (!token) throw new Error("GitHub token is missing or empty.");

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw new Error(`Invalid GitHub token: ${response.status} ${response.statusText}`);
    }

    return true;
  },
};

const GitHubPlugin: FabricPlugin = {
  id: "github",
  manifest: manifest as PluginManifest,
  auth,
  methods: createGitHubMethods(),
};

export default GitHubPlugin;
