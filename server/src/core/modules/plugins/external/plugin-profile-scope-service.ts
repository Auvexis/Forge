import fs from "node:fs";
import path from "node:path";
import {
  readProfilePluginSettings,
  writeProfilePluginSettings,
  type ProfilePluginReference,
} from "../../../runtime/profile-plugin-settings.ts";
import type { PluginInstallScope } from "./types.ts";

export interface ApplyPluginProfileScopeInput {
  profilesDir: string;
  defaultProfileDir: string;
  scope: PluginInstallScope;
  reference: ProfilePluginReference;
}

function upsertProfileReference(profileDir: string, reference: ProfilePluginReference): void {
  const settings = readProfilePluginSettings(profileDir);
  const withoutCurrent = settings.enabledPlugins.filter((plugin) => plugin.id !== reference.id);
  writeProfilePluginSettings(profileDir, {
    enabledPlugins: [...withoutCurrent, reference],
  });
}

function listProfileDirs(profilesDir: string, defaultProfileDir: string): string[] {
  const profileDirs = new Set<string>([defaultProfileDir]);
  if (!fs.existsSync(profilesDir)) return Array.from(profileDirs);

  for (const entry of fs.readdirSync(profilesDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      profileDirs.add(path.join(profilesDir, entry.name));
    }
  }

  return Array.from(profileDirs);
}

export function applyPluginProfileScope(input: ApplyPluginProfileScopeInput): void {
  const profileDirs =
    input.scope === "all_profiles"
      ? listProfileDirs(input.profilesDir, input.defaultProfileDir)
      : [input.defaultProfileDir];

  for (const profileDir of profileDirs) {
    upsertProfileReference(profileDir, input.reference);
  }
}
