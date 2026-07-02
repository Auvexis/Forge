export interface AuvexisAccountConfig {
  clientId: string;
  baseUrl: string;
  redirectUri: string;
  tokenEncryptionSecret: string;
}

const DEFAULT_CLIENT_ID = "sailor-desktop";
const DEFAULT_BASE_URL = "https://accounts.auvexis.com";
const DEFAULT_REDIRECT_URI =
  "http://127.0.0.1:23801/auvexis/account/connect/callback";

export function loadAuvexisAccountConfig(
  env: NodeJS.ProcessEnv = process.env,
  localTokenEncryptionSecret?: string,
): AuvexisAccountConfig {
  const tokenEncryptionSecret =
    env.AUVEXIS_TOKEN_ENCRYPTION_SECRET ?? localTokenEncryptionSecret;

  if (!tokenEncryptionSecret) {
    throw new Error("A local Auvexis token secret is required");
  }
  if (Buffer.byteLength(tokenEncryptionSecret, "utf8") < 32) {
    throw new Error("AUVEXIS_TOKEN_ENCRYPTION_SECRET must be at least 32 bytes");
  }

  return {
    clientId: env.AUVEXIS_CLIENT_ID ?? DEFAULT_CLIENT_ID,
    tokenEncryptionSecret,
    baseUrl: env.AUVEXIS_ACCOUNTS_URL ?? DEFAULT_BASE_URL,
    redirectUri: env.AUVEXIS_REDIRECT_URI ?? DEFAULT_REDIRECT_URI,
  };
}
