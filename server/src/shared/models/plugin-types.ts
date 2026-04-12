// ──────────── Auth Types ────────────

export type PluginAuthType = "oauth2" | "api_key" | "none";

export interface CredentialField {
  type: "string" | "number" | "boolean";
  inputType: "text" | "password" | "number" | "textarea" | "url" | "email";
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
}

export type CredentialSchema = Record<string, CredentialField>;

// ──────────── OAuth2 Tokens ────────────

export interface OAuth2Tokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  raw?: Record<string, any>;
}

// ──────────── Credential Providers ────────────

export interface OAuth2Provider {
  type: "oauth2";
  credentialSchema: CredentialSchema;
  scopes: string[];

  getAuthUrl(
    credentials: Record<string, string>,
    redirectUri: string,
  ): string | Promise<string>;

  exchangeCode(
    code: string,
    credentials: Record<string, string>,
    redirectUri: string,
  ): Promise<OAuth2Tokens>;

  testConnection?(
    tokens: OAuth2Tokens,
    credentials: Record<string, string>,
  ): Promise<boolean>;

  revokeTokens?(
    tokens: OAuth2Tokens,
    credentials: Record<string, string>,
  ): Promise<void>;

  refreshTokens?(
    tokens: OAuth2Tokens,
    credentials: Record<string, string>,
  ): Promise<OAuth2Tokens>;
}

export interface ApiKeyProvider {
  type: "api_key";
  credentialSchema: CredentialSchema;
  testConnection?(credentials: Record<string, string>): Promise<boolean>;
}

export interface NoAuthProvider {
  type: "none";
  credentialSchema?: CredentialSchema;
}

export type CredentialProvider =
  | OAuth2Provider
  | ApiKeyProvider
  | NoAuthProvider;

// ──────────── Plugin Manifest ────────────

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  author: string;
  version: string;
  repository: string;
}

// ──────────── JSON Schema Types (for method parameters & response) ────────────

/**
 * A single JSON Schema property definition.
 * Standard fields follow JSON Schema Draft 7.
 * Fields prefixed with `x-` are Forge-specific extensions.
 */
export interface JSONSchemaProperty {
  // Core JSON Schema
  type?:
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "object"
    | "array"
    | "null";
  description?: string;
  default?: any;
  enum?: any[];
  format?: string; // e.g. "binary", "base64", "uri", "date-time"
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // For type: "object"
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JSONSchemaProperty;

  // For type: "array"
  items?: JSONSchemaProperty;
  minItems?: number;
  maxItems?: number;

  // Forge-specific extensions
  "x-input-type"?:
    | "text"
    | "password"
    | "number"
    | "url"
    | "email"
    | "file"
    | "textarea";
  "x-label"?: string; // Human-readable label for UI display
  "x-forge-display"?: "file" | "folder" | "media" | "text" | "generic";
  "x-forge-icon"?: string; // Optional lucide icon name hint
}

/**
 * JSON Schema object used to declare a method's parameter set.
 * Top-level type is always "object"; properties are the named params.
 */
export interface JSONSchemaObject {
  type: "object";
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[]; // List of required property keys
  additionalProperties?: boolean;
}

/**
 * JSON Schema for method response data.
 * May be an object or array at the top level.
 */
export interface JSONSchemaResponse {
  type: "object" | "array";
  "x-forge-display"?: "file" | "folder" | "media" | "text" | "generic";

  // For type: "object"
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];

  // For type: "array"
  items?: JSONSchemaProperty & {
    type?: string;
    properties?: Record<string, JSONSchemaProperty>;
  };
}

export interface PluginMethodManifest {
  metadata: {
    label: string;
    description: string;
  };
  parameters: JSONSchemaObject;
  responseSchema: JSONSchemaResponse;
  ui: any;
}

export interface PluginManifest {
  metadata: PluginMetadata;
  methods: Record<string, PluginMethodManifest>;
}

// ──────────── Plugin Context (injected into method calls) ────────────

export interface PluginContext {
  credentials: Record<string, string>;
  tokens?: OAuth2Tokens;
}

// ──────────── ForgePlugin (the contract every plugin implements) ────────────

export interface ForgePlugin {
  id: string;
  manifest: PluginManifest;
  auth: CredentialProvider;
  methods: Record<
    string,
    (params: any, context?: PluginContext) => Promise<any>
  >;
}

// ──────────── Status Response (predictable contract for frontend) ────────────

export type PluginStatus =
  | "not_configured"
  | "configured"
  | "connected"
  | "error";

export interface PluginStatusResponse {
  status: PluginStatus;
  auth_type: PluginAuthType;
  credential_schema: CredentialSchema | null;
  credentials: Record<string, string> | null;
  error?: string;
}
