import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface Nd8HomePaths {
  home: string;
  dataDir: string;
  globalDir: string;
  globalPluginsDir: string;
  pluginCacheDir: string;
  logsDir: string;
  profilesDir: string;
  defaultProfileDir: string;
  internalPluginsDir: string;
}

export interface ResolveNd8HomeOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  homeDir?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function defaultHomeForPlatform(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  homeDir: string,
): string {
  if (platform === "win32") {
    return path.join(env.APPDATA || path.join(homeDir, "AppData", "Roaming"), "nd8");
  }

  if (platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "nd8");
  }

  return path.join(homeDir, ".config", "nd8");
}

export function resolveNd8HomePaths(options: ResolveNd8HomeOptions = {}): Nd8HomePaths {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? os.homedir();
  const home = path.resolve(env.ND8_HOME || defaultHomeForPlatform(platform, env, homeDir));
  const globalDir = path.join(home, "global");
  const profilesDir = path.join(home, "profiles");

  return {
    home,
    dataDir: path.join(home, "data"),
    globalDir,
    globalPluginsDir: path.join(globalDir, "plugins"),
    pluginCacheDir: path.join(globalDir, "plugin-cache"),
    logsDir: path.join(globalDir, "logs"),
    profilesDir,
    defaultProfileDir: path.join(profilesDir, "default"),
    internalPluginsDir: path.resolve(__dirname, "../../plugins"),
  };
}

function writeJsonIfMissing(filePath: string, value: unknown): void {
  if (fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function ensureNd8HomeStructure(paths: Nd8HomePaths): void {
  for (const dir of [
    paths.dataDir,
    paths.globalDir,
    paths.globalPluginsDir,
    paths.pluginCacheDir,
    paths.logsDir,
    paths.profilesDir,
    paths.defaultProfileDir,
    path.join(paths.defaultProfileDir, "workflows"),
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  writeJsonIfMissing(path.join(paths.defaultProfileDir, "profile.json"), {
    id: "default",
    name: "Default",
  });

  writeJsonIfMissing(path.join(paths.defaultProfileDir, "plugin-settings.json"), {
    enabledPlugins: [],
  });
}

export const nd8HomePaths = resolveNd8HomePaths();
