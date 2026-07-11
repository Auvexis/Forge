import type { PluginManifest, FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createPineconeMethods } from "./methods.ts";

const PineconePlugin: FabricPlugin = {
  id: "fabric-pinecone",
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
