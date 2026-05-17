import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProfilePaths, type ProfilePaths } from "../profiles/profile-paths.ts";
import { ProfileStore } from "../profiles/profile-store.ts";

export interface SailorHomePaths {
  home: string;
  dataDir: string;
  globalDir: string;
  globalPluginsDir: string;
  pluginCacheDir: string;
  logsDir: string;
  profilesDir: string;
  profilesIndexPath: string;
  defaultProfileDir: string;
  internalPluginsDir: string;
}

export interface ResolveSailorHomeOptions {
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
    return path.join(env.APPDATA || path.join(homeDir, "AppData", "Roaming"), "Sailor");
  }

  if (platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "Sailor");
  }

  return path.join(homeDir, ".config", "sailor");
}

export function resolveSailorHomePaths(options: ResolveSailorHomeOptions = {}): SailorHomePaths {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? os.homedir();
  const home = path.resolve(env.SAILOR_HOME || defaultHomeForPlatform(platform, env, homeDir));
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
    profilesIndexPath: path.join(home, "profiles.json"),
    defaultProfileDir: path.join(profilesDir, "default"),
    internalPluginsDir: path.resolve(__dirname, "../../plugins"),
  };
}

function writeJsonIfMissing(filePath: string, value: unknown): void {
  if (fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function ensureSailorHomeStructure(paths: SailorHomePaths): void {
  for (const dir of [
    paths.dataDir,
    paths.globalDir,
    paths.globalPluginsDir,
    paths.pluginCacheDir,
    paths.logsDir,
    paths.profilesDir,
    paths.defaultProfileDir,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const profileStore = new ProfileStore({ sailorHome: paths.home });
  profileStore.ensureInitialized();
  const defaultProfilePaths = resolveDefaultProfilePaths(paths);
  fs.mkdirSync(defaultProfilePaths.dataDir, { recursive: true });

  writeJsonIfMissing(path.join(paths.defaultProfileDir, "plugin-settings.json"), {
    enabledPlugins: [],
  });
}

export function resolveDefaultProfilePaths(paths: SailorHomePaths): ProfilePaths {
  return resolveProfilePaths({ profilesDir: paths.profilesDir, profileId: "default" });
}

export const sailorHomePaths = resolveSailorHomePaths();
