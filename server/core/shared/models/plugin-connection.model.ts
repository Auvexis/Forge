export interface PluginConnectionDBRow {
  id: number;
  plugin_id: string;
  provider: string;

  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;

  metadata: string | null;
  created_at: number;
}

export interface PluginConnectionModel {
  id: number;
  plugin_id: string;
  provider: string;

  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;

  metadata: Record<string, any> | null;
  created_at: number;
}

export function parsePluginConnectionModel(
  row: PluginConnectionDBRow,
): PluginConnectionModel {
  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  };
}
