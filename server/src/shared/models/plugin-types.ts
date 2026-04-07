// ──────────── Auth Types ────────────

export type PluginAuthType = "oauth2" | "api_key" | "none";

export interface CredentialField {
  type: "string" | "number" | "boolean";
  inputType: "text" | "password" | "number" | "url" | "email";
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

export interface PluginMethodParam {
  type: string;
  inputType: string;
  required: boolean;
  isBase64?: boolean;
}

export interface PluginMethodManifest {
  metadata: {
    label: string;
    description: string;
  };
  parameters: Record<string, PluginMethodParam>;
  responseSchema: any;
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
