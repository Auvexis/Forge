import type { Nod8Plugin } from "../../../shared/models/plugin-types.ts";

const plugins = new Map<string, Nod8Plugin>();

const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 23801;

export const PluginManager = {
  getPlugins: (): Nod8Plugin[] => {
    return Array.from(plugins.values());
  },

  getPlugin: (id: string): Nod8Plugin => {
    const plugin = plugins.get(id);

    if (!plugin) {
      throw new Error("Plugin not found: " + id);
    }

    return plugin;
  },

  registerPlugin: (plugin: Nod8Plugin) => {
    plugins.set(plugin.id, plugin);
    console.log(`[NOD8 | PLUGINS]: Registered plugin ${plugin.id}`);
  },

  getRedirectUri: (pluginId: string): string => {
    return `http://localhost:${SERVER_PORT}/plugins/${pluginId}/auth/callback`;
  },
};
