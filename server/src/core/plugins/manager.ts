const plugins = new Map<string, any>();

export const PluginManager = {
  getPlugins: () => {
    return Array.from(plugins.values());
  },

  getPlugin: (id: string) => {
    const plugin = plugins.get(id);

    if (!plugin) {
      throw new Error("Plugin not found: " + id);
    }

    return plugin;
  },

  registerPlugin: (plugin: any) => {
    plugins.set(plugin.id, plugin);
    console.log(`[FORGE | PLUGINS]: Registered plugin ${plugin.id}`);
  },
};
