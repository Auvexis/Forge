export interface PluginModel {
  id: string;
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}
