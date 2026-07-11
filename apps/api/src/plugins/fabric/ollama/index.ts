import type { FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

/**
 * Plugin definition.
 *
 * For auth, choose one of:
 *   - oauth2: For OAuth2 / Google-style auth (copy from google-drive/index.ts)
 *   - api_key: For API key auth (see plugin-types.ts for ApiKeyProvider interface)
 *   - none: For public APIs with no auth
 *
 * The plugin `id` must match manifest.metadata.id exactly.
 */
const OllamaPlugin: FabricPlugin = {
  id: "fabric-ollama",
  manifest: manifest as any,
  auth: {
    type: "none",

    credentialSchema: {
      host: {
        label: "Ollama Host",
        inputType: "text",
        required: false,
        type: "string",
        description: "Optional URL where your Ollama server is running. Defaults to local Ollama.",
        placeholder: "http://localhost:11434",
      },
      api_key: {
        label: "API Key",
        inputType: "password",
        required: false,
        type: "string",
        description: "Optional API key for Ollama Cloud or protected Ollama-compatible hosts.",
        placeholder: "OLLAMA_API_KEY",
      },
      system: {
        label: "Default System Prompt",
        inputType: "textarea",
        required: false,
        type: "string",
        description: "Default instructions for the IA (e.g. 'You are a helpful assistant'). Can be overridden in workflows.",
        placeholder: "You are a helpful assistant.",
      },
    }
  },
  
  methods: createMethods(),
};

export default OllamaPlugin;
