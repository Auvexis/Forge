import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface AuvexisLocalSecretOptions {
  sailorHome: string;
}

const SECRET_FILE = "auvexis-account-secret";

export function loadOrCreateAuvexisLocalSecret(
  options: AuvexisLocalSecretOptions,
): string {
  const globalDir = path.join(options.sailorHome, "global");
  const secretPath = path.join(globalDir, SECRET_FILE);

  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, "utf8").trim();
  }

  const secret = crypto.randomBytes(32).toString("base64url");
  fs.mkdirSync(globalDir, { recursive: true });
  fs.writeFileSync(secretPath, `${secret}\n`, { encoding: "utf8", mode: 0o600 });
  return secret;
}
