import type { CredentialSchema, OAuth2Tokens } from "@auvexis/fabric-sdk";

export type OAuth2ClientAuthMethod = "basic" | "body" | "none";
export type OAuth2TokenContentType = "form" | "json";

export interface OAuth2ScopeConfig {
  values: string[];
  paramName?: string;
  separator?: string;
}

export interface OAuth2PkceConfig {
  enabled: boolean;
  method: "S256";
}

export interface OAuth2AuthorizationConfig {
  url: string;
  method?: "GET";
  responseType?: "code";
  extraParams?: Record<string, string>;
  scope?: OAuth2ScopeConfig;
  pkce?: OAuth2PkceConfig;
}

export interface OAuth2ClientAuthConfig {
  method: OAuth2ClientAuthMethod;
  clientIdField?: string;
  clientSecretField?: string;
}

export interface OAuth2ResponseMapping {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
}

export interface OAuth2TokenConfig {
  url: string;
  method?: "POST";
  contentType?: OAuth2TokenContentType;
  clientAuth?: OAuth2ClientAuthConfig;
  exchangeParams?: Record<string, string>;
  refreshParams?: Record<string, string>;
  responseMapping?: OAuth2ResponseMapping;
}

export interface OAuth2TestConnectionConfig {
  url: string;
  method?: "GET" | "POST";
  auth?: "bearer";
}

export interface OAuth2DeclarativeAuth {
  type: "oauth2";
  credentialSchema: CredentialSchema;
  authorization: OAuth2AuthorizationConfig;
  token: OAuth2TokenConfig;
  testConnection?: OAuth2TestConnectionConfig;
  ui?: {
    oauthCallbackInstructions?: string;
    buttonText?: string;
    buttonIcon?: string;
  };
}

export interface CustomOAuth2Auth {
  type: "oauth2";
  credentialSchema: CredentialSchema;
  getAuthUrl(credentials: Record<string, string>, redirectUri: string): string | Promise<string>;
  exchangeCode(code: string, credentials: Record<string, string>, redirectUri: string): Promise<OAuth2Tokens>;
  testConnection?(tokens: OAuth2Tokens, credentials: Record<string, string>): Promise<boolean>;
  revokeTokens?(tokens: OAuth2Tokens, credentials: Record<string, string>): Promise<void>;
  refreshTokens?(tokens: OAuth2Tokens, credentials: Record<string, string>): Promise<OAuth2Tokens>;
  ui?: OAuth2DeclarativeAuth["ui"];
}

export function isDeclarativeOAuth2Auth(auth: unknown): auth is OAuth2DeclarativeAuth {
  const candidate = auth as OAuth2DeclarativeAuth | undefined;
  return (
    candidate?.type === "oauth2" &&
    typeof candidate.authorization?.url === "string" &&
    typeof candidate.token?.url === "string"
  );
}

export function isLegacyOAuth2Auth(auth: unknown): auth is CustomOAuth2Auth {
  const candidate = auth as CustomOAuth2Auth | undefined;
  return (
    candidate?.type === "oauth2" &&
    typeof candidate.getAuthUrl === "function" &&
    typeof candidate.exchangeCode === "function"
  );
}
