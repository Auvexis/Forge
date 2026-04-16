import type { Plugin } from "../types/plugin";

export const buildGraph = (plugins: Plugin[]) => {
  const nodes = plugins.map((plugin) => ({
    id: plugin.id,
    type: "plugin",
    data: {
      id: plugin.id,
      label: plugin.manifest.metadata.name,
      icon: plugin.manifest.metadata.icon,
      category: plugin.manifest.metadata.category,
      author: plugin.manifest.metadata.author,
    },
    position: { x: 0, y: 0 },
  }));

  const edges: any[] = [];

  for (let i = 0; i < plugins.length; i++) {
    for (let j = i + 1; j < plugins.length; j++) {
      const a = plugins[i].manifest.metadata;
      const b = plugins[j].manifest.metadata;

      if (a.author?.toLowerCase() === b.author?.toLowerCase()) {
        edges.push({
          id: `${plugins[i].id}-${plugins[j].id}`,
          source: plugins[i].id,
          target: plugins[j].id,
          type: "floating",
        });
      }
    }
  }

  return { nodes, edges };
};
