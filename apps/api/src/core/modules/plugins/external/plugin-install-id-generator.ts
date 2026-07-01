import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface GeneratePluginInstallIdOptions {
  requestedInstallId?: string;
  randomHex32?: () => string;
  maxAttempts?: number;
}

function defaultRandomHex32(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generatePluginInstallId(
  pluginId: string,
  pluginsDir: string,
  options: GeneratePluginInstallIdOptions = {},
): string {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pluginId)) {
    throw new Error(`Plugin id must be kebab-case before generating install id: ${pluginId}`);
  }

  const randomHex32 = options.randomHex32 ?? defaultRandomHex32;
  const maxAttempts = options.maxAttempts ?? 20;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const suffix = randomHex32();
    if (!/^[a-f0-9]{32}$/.test(suffix)) {
      throw new Error("Generated install id suffix must be lowercase hex32");
    }

    const installId = `${pluginId}-${suffix}`;
    if (!fs.existsSync(path.join(pluginsDir, installId))) {
      return installId;
    }
  }

  throw new Error("Could not generate a unique plugin install id");
}
