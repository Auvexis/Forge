export interface AuvexisAccountConfig {
  clientId: string;
  baseUrl: string;
  redirectUri: string;
  tokenEncryptionSecret: string;
}

export function loadAuvexisAccountConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuvexisAccountConfig {
  const clientId = required(env.AUVEXIS_CLIENT_ID, "AUVEXIS_CLIENT_ID");
  const tokenEncryptionSecret = required(
    env.AUVEXIS_TOKEN_ENCRYPTION_SECRET,
    "AUVEXIS_TOKEN_ENCRYPTION_SECRET",
  );
  if (Buffer.byteLength(tokenEncryptionSecret, "utf8") < 32) {
    throw new Error("AUVEXIS_TOKEN_ENCRYPTION_SECRET must be at least 32 bytes");
  }

  return {
    clientId,
    tokenEncryptionSecret,
    baseUrl: env.AUVEXIS_ACCOUNTS_URL ?? "https://accounts.auvexis.com",
    redirectUri:
      env.AUVEXIS_REDIRECT_URI ??
      "http://127.0.0.1:23801/auvexis/account/connect/callback",
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
