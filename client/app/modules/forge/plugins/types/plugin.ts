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
  locked_fields?: string[];   // Fields provided via ENV — cannot be overridden via UI
  error?: string;
}

// ─── JSON Schema Types (mirrors server JSONSchemaProperty/Object) ──

export interface JSONSchemaProperty {
  type?: "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";
  description?: string;
  default?: any;
  enum?: any[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  items?: JSONSchemaProperty;
  minItems?: number;
  maxItems?: number;
  // Forge extensions
  "x-input-type"?: "text" | "password" | "number" | "url" | "email" | "file" | "textarea";
  "x-label"?: string;
  "x-nod8-display"?: "file" | "folder" | "media" | "text" | "generic";
  "x-nod8-icon"?: string;
}

export interface JSONSchemaObject {
  type: "object";
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

// ─── Response Schema ───────────────────────────────────────

export interface PluginManifestResponseSchema {
  type: "object" | "array";
  "x-nod8-display"?: "file" | "folder" | "media" | "text" | "generic";
  /** @deprecated use x-nod8-display */
  "x-type"?: string;

  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];

  items?: JSONSchemaProperty & {
    type?: string;
    properties?: Record<string, JSONSchemaProperty>;
  };
}

// ─── UI Hints ─────────────────────────────────────────────

export interface PluginMethodUI {
  component: "table" | "card" | "text" | "generic";
  download?: {
    field: string;
    fileName: string;
    mimeType: string;
  };
  actions?: {
    label: string;
    action: string;
    parameters: Record<string, string>;
    visibleIf?: {
      field: string;
      equals: any;
    };
  }[];
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

      parameters: JSONSchemaObject;

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
