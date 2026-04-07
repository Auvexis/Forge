import type {
  ForgePlugin,
  PluginContext,
} from "../../shared/models/plugin-types.ts";
import { PluginManager } from "./manager.ts";
import { CredentialStore } from "./credential-store.ts";

export const PluginExecutor = {
  execute: async (
    pluginId: string,
    methodName: string,
    params: Record<string, any>,
  ) => {
    const plugin: ForgePlugin = PluginManager.getPlugin(pluginId);

    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const method = plugin.methods[methodName];

    if (!method) {
      throw new Error(`Method ${methodName} not found in plugin ${pluginId}`);
    }

    // Build context with credentials and tokens
    const context: PluginContext = {
      credentials: CredentialStore.getCredentials(pluginId) ?? {},
      tokens: CredentialStore.getTokens(pluginId) ?? undefined,
    };

    const result = await method(params, context);

    return result;
  },
};
