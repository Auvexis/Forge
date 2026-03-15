export interface PluginModel {
  id: string;
  name: string;
  enabled: boolean;
  version: string;
  author: string;
  config: string | null;
}

export type PluginMethods = {
  [methodName: string]: (params: any) => Promise<any>;
};

export interface PluginExportModel {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  methods: PluginMethods;
  manifest: Record<string, any>;
  config: Record<string, any>;
}
