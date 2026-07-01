import type { PluginManifest, SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createQdrantMethods } from "./methods.ts";

const QdrantPlugin: SailorPlugin = {
  id: "sailor-qdrant",
  manifest: manifest as PluginManifest,
  auth: {
    type: "api_key",
    credentialSchema: {
      apiKey: {
        type: "string",
        inputType: "password",
        label: "API Key",
        required: false,
        description: "Required for Qdrant Cloud. Optional for local or self-hosted Qdrant.",
      },
    },
  },
  methods: createQdrantMethods(),
};

export default QdrantPlugin;
