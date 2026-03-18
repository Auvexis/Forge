import type { PluginModel } from "../../shared/models/plugin.model.ts";

const plugins = new Map<string, PluginModel>();

export const PluginManager = {
  getPlugins: (): PluginModel[] => {
    return Array.from(plugins.values());
  },

  getPlugin: (id: string): PluginModel => {
    const plugin = plugins.get(id);

    if (!plugin) {
      throw new Error("Plugin not found: " + id);
    }

    return plugin;
  },

  registerPlugin: (plugin: PluginModel) => {
    plugins.set(plugin.id, plugin);
    console.log(`[FORGE | PLUGINS]: Registered plugin ${plugin.id}`);
  },
};
