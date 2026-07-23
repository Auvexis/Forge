import type { FabricPlugin } from "@auvexis/fabric-sdk";
import { PublicUrlService } from "../app/public-url-service.ts";

const plugins = new Map<string, FabricPlugin>();

export const PluginManager = {
  getPlugins: (): FabricPlugin[] => {
    return Array.from(plugins.values());
  },

  getPlugin: (id: string): FabricPlugin => {
    const plugin = plugins.get(id);

    if (!plugin) {
      throw new Error("Plugin not found: " + id);
    }

    return plugin;
  },

  registerPlugin: (plugin: FabricPlugin) => {
    plugins.set(plugin.id, plugin);
    console.log(`[FABRIC | PLUGINS]: Registered plugin ${plugin.id}`);
  },

  clearPlugins: () => {
    plugins.clear();
  },

  getRedirectUri: (pluginId: string): string => {
    return `${PublicUrlService.getPublicUrl()}/plugins/${pluginId}/auth/callback`;
  },

  isLocalRedirectUri: (redirectUri: string): boolean => {
    return PublicUrlService.isLocalUrl(redirectUri);
  },
};
