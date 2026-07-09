import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type AuvexisAccountConnectionStatus =
  | "connected"
  | "needs_reconnect"
  | "disconnected";

export interface StoredAuvexisBadge {
  id: string;
  slug: string;
  name: string;
  style: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
  iconUrl: string | null;
  permissions?: Record<string, Record<string, boolean>>;
  awardedAt: string;
}

export interface StoredAuvexisAccount {
  id: string;
  username: string;
  email?: string;
  badges: StoredAuvexisBadge[];
}

export interface StoredAuvexisCapabilities {
  canUseDonatorTheme: boolean;
  canCreateMoreThan6Workflows: boolean;
}

export interface StoredAuvexisTokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  scope: string[];
  expiresAt?: number;
}

interface StoredAuvexisAccountConnectionFile {
  version: 1;
  status: AuvexisAccountConnectionStatus;
  account: StoredAuvexisAccount | null;
  encryptedTokens: string | null;
  connectedAt: string | null;
  updatedAt: string;
  lastValidatedAt: string | null;
}

export interface AuvexisAccountConnection {
  version: 1;
  status: AuvexisAccountConnectionStatus;
  account: StoredAuvexisAccount | null;
  tokens: StoredAuvexisTokenSet | null;
  connectedAt: string | null;
  updatedAt: string;
  lastValidatedAt: string | null;
}

export interface AuvexisAccountStorageOptions {
  dataDir: string;
  tokenEncryptionSecret: string;
  clock?: () => Date;
}

export interface SaveConnectedInput {
  account: StoredAuvexisAccount;
  tokens: StoredAuvexisTokenSet;
}

export interface MarkValidatedInput {
  account: StoredAuvexisAccount;
}

const CONNECTION_FILE = "auvexis-account.json";

export function createAuvexisAccountStorage(
  options: AuvexisAccountStorageOptions,
) {
  const dataDir = path.resolve(options.dataDir);
  const filePath = path.join(dataDir, CONNECTION_FILE);
  const key = deriveEncryptionKey(options.tokenEncryptionSecret);
  const clock = options.clock ?? (() => new Date());

  const readFile = (): StoredAuvexisAccountConnectionFile =>
    readConnectionFile(filePath);

  const writeFile = (value: StoredAuvexisAccountConnectionFile): void => {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  };

  return {
    read(): AuvexisAccountConnection {
      return hydrateConnection(readFile(), key);
    },

    saveConnected(input: SaveConnectedInput): void {
      const now = clock().toISOString();
      writeFile({
        version: 1,
        status: "connected",
        account: input.account,
        encryptedTokens: encryptJson(input.tokens, key),
        connectedAt: now,
        updatedAt: now,
        lastValidatedAt: null,
      });
    },

    markNeedsReconnect(): void {
      const current = readFile();
      writeFile({
        ...current,
        status: "needs_reconnect",
        updatedAt: clock().toISOString(),
      });
    },

    markValidated(input: MarkValidatedInput): void {
      const now = clock().toISOString();
      const current = readFile();
      writeFile({
        ...current,
        status: "connected",
        account: input.account,
        updatedAt: now,
        lastValidatedAt: now,
      });
    },

    clearLocal(): void {
      writeFile({
        version: 1,
        status: "disconnected",
        account: null,
        encryptedTokens: null,
        connectedAt: null,
        updatedAt: clock().toISOString(),
        lastValidatedAt: null,
      });
    },
  };
}

function readConnectionFile(
  filePath: string,
): StoredAuvexisAccountConnectionFile {
  if (!fs.existsSync(filePath)) return defaultConnectionFile();
  return JSON.parse(
    fs.readFileSync(filePath, "utf8"),
  ) as StoredAuvexisAccountConnectionFile;
}

function defaultConnectionFile(): StoredAuvexisAccountConnectionFile {
  return {
    version: 1,
    status: "disconnected",
    account: null,
    encryptedTokens: null,
    connectedAt: null,
    updatedAt: new Date(0).toISOString(),
    lastValidatedAt: null,
  };
}

function hydrateConnection(
  value: StoredAuvexisAccountConnectionFile,
  key: Buffer,
): AuvexisAccountConnection {
  return {
    version: 1,
    status: value.status,
    account: value.account,
    tokens: value.encryptedTokens
      ? decryptJson<StoredAuvexisTokenSet>(value.encryptedTokens, key)
      : null,
    connectedAt: value.connectedAt,
    updatedAt: value.updatedAt,
    lastValidatedAt: value.lastValidatedAt,
  };
}

function deriveEncryptionKey(secret: string): Buffer {
  if (/^[a-f0-9]{64}$/iu.test(secret)) return Buffer.from(secret, "hex");
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("Auvexis token encryption secret must be at least 32 bytes");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

function encryptJson(value: unknown, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

function decryptJson<T>(encrypted: string, key: Buffer): T {
  const [version, iv, authTag, ciphertext] = encrypted.split(":");
  if (version !== "v1" || !iv || !authTag || !ciphertext) {
    throw new Error("Invalid Auvexis token payload");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
