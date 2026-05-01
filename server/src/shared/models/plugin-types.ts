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
 * Instructs the Frontend to populate a select/multiselect field by calling
 * a specific method on the plugin itself. This keeps the frontend generic —
 * it doesn't know anything about Google Drive, Slack, etc.
 *
 * @example
 * "folderId": {
 *   "type": "string",
 *   "x-input-type": "select",
 *   "x-dynamic-options": {
 *     "method": "listFolders",
 *     "labelPath": "name",
 *     "valuePath": "id",
 *     "dependsOn": ["driveType"]
 *   }
 * }
 */
export interface DynamicOptionsConfig {
  /** The method name in `methods.ts` to call to retrieve the list. Must return an array. */
  method: string;
  /** Dot-notation path into each item of the returned array to use as the option's display label. */
  labelPath: string;
  /** Dot-notation path into each item of the returned array to use as the option's submitted value. */
  valuePath: string;
  /**
   * Optional list of other parameter keys. When any of those fields change,
   * the options list is automatically re-fetched.
   */
  dependsOn?: string[];
}

/**
 * Conditionally shows or hides a field in the UI based on the value of another field.
 * This prevents cluttering the form with irrelevant parameters.
 *
 * @example
 * "spreadsheetId": {
 *   "type": "string",
 *   "x-visible-if": { "field": "actionType", "operator": "equals", "value": "update_row" }
 * }
 */
export interface VisibleIfConfig {
  /** The key of the sibling parameter to observe. */
  field: string;
  /** The comparison operator. */
  operator: "equals" | "not_equals" | "in" | "contains";
  /** The value to compare against. For `in`, this should be an array. */
  value: any;
}

/**
 * A single JSON Schema property definition.
 * Standard fields follow JSON Schema Draft 7.
 * Fields prefixed with `x-` are Nod8-specific UI rendering extensions.
 * These extensions are the core of Nod8's "declarative UI" system —
 * a plugin developer only needs to write JSON to get rich, dynamic UIs.
 */
export interface JSONSchemaProperty {
  // ── Core JSON Schema (Draft 7) ────────────────────────────────
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

  // ── Nod8 UI Extension: Input Rendering ───────────────────────
  /**
   * Hints to the Frontend which UI component to render.
   * - `select`/`multiselect`: renders a dropdown. Use with `enum` (static) or `x-dynamic-options` (dynamic).
   * - `toggle`: renders a switch. Ideal for boolean fields.
   * - `datetime`: renders a date/time picker.
   * - `code`: renders a code editor (Monaco/CodeMirror). Ideal for raw text, JSON bodies, SQL.
   * - `json`: like `code` but pre-validates the input as JSON.
   */
  "x-input-type"?:
    | "text"
    | "password"
    | "number"
    | "url"
    | "email"
    | "file"
    | "files"
    | "textarea"
    | "select"
    | "multiselect"
    | "toggle"
    | "datetime"
    | "code"
    | "json";

  /** Human-readable label shown in the UI. Falls back to the property key if absent. */
  "x-label"?: string;

  /** Hints to the result renderer how to display this field's output. */
  "x-nod8-display"?: "file" | "folder" | "media" | "text" | "generic";

  /** Optional Lucide icon name to display alongside the field label in the UI. */
  "x-nod8-icon"?: string;

  // ── Nod8 UI Extension: Dynamic Options ───────────────────────
  /**
   * When present, the Frontend calls the specified plugin method at runtime
   * to populate this field's options. This is what allows plugins to have
   * rich, API-powered dropdowns without any frontend-specific code.
   * Only meaningful when `x-input-type` is `select` or `multiselect`.
   */
  "x-dynamic-options"?: DynamicOptionsConfig;

  // ── Nod8 UI Extension: Conditional Visibility ────────────────
  /**
   * When present, the field is only rendered if the condition evaluates to true.
   * This keeps the form clean by hiding irrelevant parameters.
   */
  "x-visible-if"?: VisibleIfConfig;
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
  "x-nod8-display"?: "file" | "folder" | "media" | "text" | "generic";

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

// ──────────── Nod8Plugin (the contract every plugin implements) ────────────

export interface Nod8Plugin {
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
