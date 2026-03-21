export interface PluginMethod {
  description: string;
  parameters: Record<
    string,
    {
      type: string;
      required: boolean;
    }
  >;
  responseExample: {
    data: Record<string, unknown>[];
  };
}

export interface PluginManifest {
  name: string;
  id: string;
  description: string;
  methods: Record<string, PluginMethod>;
}
