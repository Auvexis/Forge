import type { Nod8Plugin } from "../../../shared/models/plugin-types.ts";
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
const OllamaPlugin: Nod8Plugin = {
  id: "nod8-ollama",
  manifest: manifest as any,
  auth: {
    type: "none",

    credentialSchema: {
      host: {
        label: "Ollama Host",
        inputType: "text",
        required: true,
        type: "string",
        description: "The URL where your Ollama server is running",
        placeholder: "http://localhost:11434",
      },
      model: {
        label: "Model",
        inputType: "text",
        required: true,
        type: "string",
        description: "The name of the model to use (e.g., llama3, mistral)",
        placeholder: "llama3",
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
