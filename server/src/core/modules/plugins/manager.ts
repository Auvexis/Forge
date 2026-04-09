import type { ForgePlugin } from "../../../shared/models/plugin-types.ts";

const plugins = new Map<string, ForgePlugin>();

const SERVER_PORT = 8032;

export const PluginManager = {
  getPlugins: (): ForgePlugin[] => {
    return Array.from(plugins.values());
  },

  getPlugin: (id: string): ForgePlugin => {
    const plugin = plugins.get(id);

    if (!plugin) {
      throw new Error("Plugin not found: " + id);
    }

    return plugin;
  },

  registerPlugin: (plugin: ForgePlugin) => {
    plugins.set(plugin.id, plugin);
    console.log(`[FORGE | PLUGINS]: Registered plugin ${plugin.id}`);
  },

  getRedirectUri: (pluginId: string): string => {
    return `http://localhost:${SERVER_PORT}/plugins/${pluginId}/auth/callback`;
  },
};
