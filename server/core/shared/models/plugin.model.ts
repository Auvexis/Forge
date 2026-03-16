export type PluginMethods = {
  [methodName: string]: (params: any) => Promise<any>;
};

export interface PluginDBRow {
  id: string;
  icon: string | null;
  name: string;
  description: string | null;
  version: string;
  author: string;
  repository: string | null;
  enabled: number;
  config: string | null;
}

export interface PluginModel {
  id: string;
  icon: string;
  name: string;
  description: string;
  version: string;
  author: string;
  repository: string;
  enabled: boolean;
  methods: PluginMethods;
  manifest: Record<string, any>;
  config: Record<string, any>;
}

export function parsePluginDBRow(row: PluginDBRow): PluginModel {
  return {
    id: row.id,
    icon: row.icon || "",
    name: row.name,
    description: row.description || "",
    version: row.version,
    author: row.author,
    repository: row.repository || "",
    enabled: Boolean(row.enabled),
    config: row.config ? JSON.parse(row.config) : {},
    methods: {},
    manifest: {},
  };
}

export function parsePluginModelToDBRow(plugin: PluginModel): PluginDBRow {
  return {
    id: plugin.id,
    icon: plugin.icon,
    name: plugin.name,
    description: plugin.description,
    version: plugin.version,
    author: plugin.author,
    repository: plugin.repository,
    enabled: plugin.enabled ? 1 : 0,
    config: JSON.stringify(plugin.config),
  };
}
