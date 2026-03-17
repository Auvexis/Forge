export interface GoogleDriveModel {
  id: string;
  icon: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  repository: string;
  manifest: string;
  methods: any;
}

export interface GoogleDriveOAuthModel {
  plugin_id: string;

  client_id: string;
  client_secret: string;

  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;

  refresh_token_expires_in: number;
  expiry_date: number;
}
