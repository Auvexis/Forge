import type { ForgePlugin } from "../../shared/models/plugin-types.ts";
import type { PluginManifest } from "../../shared/models/plugin-types.ts";
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
const MyPlugin: ForgePlugin = {
  id: "my-plugin",
  manifest: manifest as any,
  auth: {
    type: "none",
  },
  methods: createMethods(),
};

export default MyPlugin;
