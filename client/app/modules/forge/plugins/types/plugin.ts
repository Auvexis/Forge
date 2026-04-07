// ─── Auth Types (mirrors server plugin-types.ts) ────────

export type PluginAuthType = "oauth2" | "api_key" | "none";

export type PluginStatus =
  | "not_configured"
  | "configured"
  | "connected"
  | "error";

export interface CredentialField {
  type: "string" | "number" | "boolean";
  inputType: "text" | "password" | "number" | "url" | "email";
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
}

export type CredentialSchema = Record<string, CredentialField>;

// ─── Plugin Status Response (single contract for all plugins) ──

export interface PluginStatusResponse {
  status: PluginStatus;
  auth_type: PluginAuthType;
  credential_schema: CredentialSchema | null;
  credentials: Record<string, string> | null;
  error?: string;
}

export interface PluginMethodUI {
  component: "table" | "card" | "text";
  download?: {
    field: string;
    fileName: string;
    mimeType: string;
  };
  actions?: {
    label: string;
    action: string;
    parameters: {
      [key: string]: string;
    };
    visibleIf?: {
      field: string;
      equals: any;
    };
  }[];
}

export interface PluginManifestResponseSchema {
  type: "object" | "array";
  "x-type": "file" | "folder" | "text";

  properties?: {
    [key: string]: {
      type: string;
      label: string;
    };
  };

  items?: {
    type: "object" | "array";
    properties?: {
      [key: string]: {
        type: string;
        label: string;
      };
    };
  };
}

// ─── Plugin Manifest ─────────────────────────────────────

export type PluginManifest = {
  metadata: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    author: string;
    version: string;
    repository: string;
  };

  methods: {
    [key: string]: {
      metadata: {
        label: string;
        description: string;
      };

      parameters: {
        [key: string]: {
          type: string;
          inputType: string;
          required: boolean;
          isBase64?: boolean;
        };
      };

      responseSchema: PluginManifestResponseSchema;

      ui: PluginMethodUI;
    };
  };
};

// ─── Plugin (from GET /plugins/:id) ──────────────────────

export type Plugin = {
  id: string;
  manifest: PluginManifest;
  status: PluginStatus;
  auth_type: PluginAuthType;
};
