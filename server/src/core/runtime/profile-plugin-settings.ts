import fs from "node:fs";
import path from "node:path";
import type { PluginSource } from "../modules/plugins/plugin-registry.ts";

export interface ProfilePluginReference {
  id: string;
  source: PluginSource;
  version: string;
}

export interface ProfilePluginSettings {
  enabledPlugins: ProfilePluginReference[];
}

const defaultSettings: ProfilePluginSettings = {
  enabledPlugins: [],
};

function settingsPath(profileDir: string): string {
  return path.join(profileDir, "plugin-settings.json");
}

export function readProfilePluginSettings(profileDir: string): ProfilePluginSettings {
  const filePath = settingsPath(profileDir);
  if (!fs.existsSync(filePath)) {
    return { ...defaultSettings };
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<ProfilePluginSettings>;
  return {
    enabledPlugins: Array.isArray(parsed.enabledPlugins) ? parsed.enabledPlugins : [],
  };
}

export function writeProfilePluginSettings(
  profileDir: string,
  settings: ProfilePluginSettings,
): void {
  fs.mkdirSync(profileDir, { recursive: true });
  fs.writeFileSync(settingsPath(profileDir), `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}
