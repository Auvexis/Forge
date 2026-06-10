import type { PluginManifest, SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createPineconeMethods } from "./methods.ts";

const PineconePlugin: SailorPlugin = {
  id: "sailor-pinecone",
  manifest: manifest as PluginManifest,
  auth: {
    type: "api_key",
    credentialSchema: {
      apiKey: {
        type: "string",
        inputType: "password",
        label: "API Key",
        required: false,
        description: "Required for Pinecone Cloud. Leave empty for Pinecone Local.",
      },
    },
  },
  methods: createPineconeMethods(),
};

export default PineconePlugin;
